import type {
  KanbanArchivedCard,
  KanbanAutoArchiveRule,
  CardActivity,
  CardFile,
  KanbanAppState,
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
  KanbanFilters,
  KanbanStoppedCard,
  CardTypeDef,
} from "./types";
import type { UserRole } from "@prisma/client";
import { buildKaitenCardTitle } from "@/lib/kaiten-card-title";
import { normalizeKanbanColumnTitle } from "@/lib/kaiten-column-title";
import {
  resolveLinkedOrderKanbanDescription,
  resolveLinkedOrderKanbanTitle,
  type KaitenLinkedOrderForKanban,
} from "@/lib/kanban/kaiten-linked-order";
import { applyKanbanLegacyStageDueClearMigration, getKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import { stripPersonalKanbanUiForTenant } from "@/lib/kanban/user-board-ui-state";
import { clientStatePayloadTooLarge } from "@/lib/client-state-limits";
import { kanbanCardMatchesSearch } from "@/lib/kanban/kanban-card-search";
import {
  collectCardTypeDefaultLanes,
  defaultTrackLaneForCardTypeName,
  mergeCardTypeDefsKeepingLanes,
  pickPreservedCardTypeLane,
} from "@/lib/kanban/card-type-default-lane";

export const STORAGE_KEY = "kanban-app-state-v3";
export const STORAGE_KEY_LEGACY = "kanban-app-state-v2";
/** Исторические имена ключей (оставлены для совместимости типов и миграционных комментариев). */
export const STORAGE_KEY_V1_LEGACY = "kanban-app-state-v1";
/** Исторический демо-ключ (до переноса в серверное хранилище). */
export const STORAGE_KEY_DEMO = "kanban-app-state-v3-demo";
let memoryStateRawLive: string | null = null;
let memoryStateRawDemo: string | null = null;

export function kanbanPersistenceKey(isDemo: boolean): string {
  return isDemo ? STORAGE_KEY_DEMO : STORAGE_KEY;
}

/** Сброс in-memory кеша канбана. */
export function clearKanbanBrowserStorage(isDemo: boolean): void {
  if (isDemo) {
    memoryStateRawDemo = null;
    return;
  }
  memoryStateRawLive = null;
}
/** Максимальный размер файла во вложениях карточки Kanban. */
export const MAX_FILE_BYTES = 300 * 1024 * 1024;

export function trackLanes() {
  return [
    { id: "ORTHOPEDICS", name: "Ортопедия" },
    { id: "ORTHODONTICS", name: "Ортодонтия" },
  ] as const;
}

/** Доски канбана (не демо): соответствуют дорожкам Kaiten ORTHOPEDICS / ORTHODONTICS. */
export const KANBAN_BOARD_ORTHOPEDICS_ID = "kanban_board_orthopedics";
export const KANBAN_BOARD_ORTHODONTICS_ID = "kanban_board_orthodontics";
export const KANBAN_BOARD_PRODUCTION_ID = "kanban-board-production";

function defaultDistributeNewOrdersByBoardId(boardId: string): boolean {
  return (
    boardId === KANBAN_BOARD_ORTHOPEDICS_ID ||
    boardId === KANBAN_BOARD_ORTHODONTICS_ID
  );
}

/**
 * Виртуальные доски: только представление, карточки остаются на дорожках «Ортопедия» / «Ортодонтия».
 * «Мои» — участник или ответственный (или своя локальная карточка без наряда).
 * «Ответственный» — только карточки, где пользователь в ответственных (`assignees`).
 */
export const KANBAN_BOARD_MY_CARDS_ID = "kanban_board_my_cards";
export const KANBAN_BOARD_DISTRIBUTE_ID = "kanban_board_distribute";

/** Режим виртуальной доски: `distribute` в коде = доска «Ответственный» в UI. */
export type KanbanAggregateMode = "my" | "distribute";

export function kanbanAggregateMode(activeBoardId: string): KanbanAggregateMode | null {
  if (activeBoardId === KANBAN_BOARD_MY_CARDS_ID) return "my";
  if (activeBoardId === KANBAN_BOARD_DISTRIBUTE_ID) return "distribute";
  return null;
}

export function isKanbanAggregateBoardId(id: string): boolean {
  return kanbanAggregateMode(id) != null;
}

/** Открытая доска доступна всем; закрытая — только пользователям из списка. */
export function canUserAccessBoard(
  board: KanbanBoard,
  userId: string | null | undefined,
  role?: UserRole | null,
): boolean {
  if (board.isPrivate !== true) return true;
  if (
    board.allowProductionRoleAccess === true &&
    (role === "PRODUCTION" || role === "SENIOR_PRODUCTION")
  ) {
    return true;
  }
  const uid = String(userId || "").trim();
  if (!uid) return false;
  return (board.accessUserIds || []).includes(uid);
}

/** Шаблон колонок / типов для виртуальных досок и fallback активной доски. */
export function getKanbanLayoutTemplateBoard(state: KanbanAppState): KanbanBoard {
  return (
    state.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID) ?? state.boards[0]!
  );
}

/** Откуда собирать карточки на «Мои» / «Ответственный» (зеркала Kaiten или одна демо-доска). */
export function listKanbanAggregateSourceBoards(state: KanbanAppState): KanbanBoard[] {
  const mirrors = state.boards.filter(
    (b) =>
      b.id === KANBAN_BOARD_ORTHOPEDICS_ID || b.id === KANBAN_BOARD_ORTHODONTICS_ID,
  );
  if (mirrors.length > 0) return mirrors;
  return [...state.boards];
}

/**
 * Колонки как на доске Kaiten (порядок слева направо).
 * См. подсказки KAITEN_*_COLUMN в `.env.example`.
 */
export const KAITEN_MIRROR_KANBAN_COLUMNS: { idSuffix: string; title: string }[] = [
  { idSuffix: "col_scan", title: "НА СКАН" },
  { idSuffix: "col_queue", title: "К исполнению" },
  { idSuffix: "col_approval", title: "Согласование" },
  { idSuffix: "col_prod", title: "Производство" },
  { idSuffix: "col_assembly", title: "Сборка" },
  { idSuffix: "col_process", title: "Обработка" },
  { idSuffix: "col_manual", title: "Мануал" },
  { idSuffix: "col_review", title: "На проверку" },
  { idSuffix: "col_shipped", title: "Сдана админам" },
];

/** Колонка по умолчанию для новых карточек наряда (как «очередь» в Kaiten). */
export const KAITEN_MIRROR_DEFAULT_QUEUE_TITLE = "К исполнению";

export function buildKaitenMirrorColumnsForBoard(boardId: string): KanbanColumn[] {
  const colPrefix = boardId.replace(/[^a-zA-Z0-9_]/g, "_");
  return KAITEN_MIRROR_KANBAN_COLUMNS.map(({ idSuffix, title }) => ({
    id: `${colPrefix}_${idSuffix}`,
    title,
    cards: [],
  }));
}

function boardHasKaitenMirrorColumns(board: KanbanBoard): boolean {
  const titles = new Set(
    board.columns.map((c) => c.title.trim().toLowerCase()),
  );
  return (
    board.columns.length >= 8 &&
    titles.has("сдана админам") &&
    titles.has("к исполнению")
  );
}

/** Старые 4 колонки (Бэклог / To Do / …) → цепочка Kaiten; карточки перекладываются по этапам. */
function migrateBoardColumnsToKaitenMirror(board: KanbanBoard): void {
  if (!board.columns?.length) return;
  if (boardHasKaitenMirrorColumns(board)) return;
  const tl = board.columns.map((c) => c.title.trim().toLowerCase());
  const legacyFour =
    board.columns.length === 4 &&
    (tl[0] === "бэклог" ||
      tl[0] === "backlog" ||
      tl[1] === "to do" ||
      tl[2] === "in progress" ||
      tl[3] === "done" ||
      tl[3] === "готово");
  if (!legacyFour) return;

  const newCols = buildKaitenMirrorColumnsForBoard(board.id);
  const oldToNewIndex = [1, 2, 4, 8];
  for (let oi = 0; oi < board.columns.length; oi++) {
    const ni = Math.min(
      oldToNewIndex[oi] ?? 1,
      newCols.length - 1,
    );
    for (const card of [...board.columns[oi]!.cards]) {
      newCols[ni]!.cards.push(card);
    }
  }
  board.columns = newCols;
}

/** Демо: «дорожка» = одна доска «Работы» (не Kaiten lane ортопедия/ортодонтия). */
export const DEMO_KANBAN_TRACK_LANE_ID = "DEMO_WORK";

export function demoTrackLanes() {
  return [{ id: DEMO_KANBAN_TRACK_LANE_ID, name: "Работы" }] as const;
}

/**
 * Типы карточек канбана в демо — названия как у позиций прайса в `lib/demo-seed.ts`.
 * При изменении прайса в сиде синхронизируйте этот список.
 */
export function demoKanbanPriceCardTypes(): CardTypeDef[] {
  const palette = ["#5b8cff", "#ff55dd", "#40f090", "#00d4ff", "#ffb020", "#a78bfa"];
  const names = [
    "Позиция · диагностика",
    "Позиция · временная коронка",
    "Позиция · коронка Zr",
    "Позиция · коронка МК",
    "Позиция · вкладка",
    "Позиция · винир",
    "Позиция · абатмент",
    "Позиция · мост 3 ед.",
    "Позиция · съёмный частичный",
    "Позиция · каппа",
    "Позиция · ретейнер",
    "Позиция · индивидуальная ложка",
  ];
  return names.map((name, i) => ({
    id: `demo_pl_${String(i + 1).padStart(3, "0")}`,
    name,
    sortOrder: (i + 1) * 10,
    color: palette[i % palette.length]!,
  }));
}

/** Цвета и порядок как в актуальном списке типов Kaiten. */
export function kaitenCardTypes(): CardTypeDef[] {
  const rows: CardTypeDef[] = [
    { id: "kt_vrem", name: "Временные", sortOrder: 10, color: "#22c55e" },
    { id: "kt_mio", name: "МиоСплинт", sortOrder: 20, color: "#06b6d4" },
    { id: "kt_mod", name: "Модели", sortOrder: 30, color: "#92400e" },
    { id: "kt_nak", name: "Накладки", sortOrder: 40, color: "#2563eb" },
    { id: "kt_nakmrt", name: "Накладки МРТ", sortOrder: 50, color: "#1f2937" },
    { id: "kt_orto", name: "ОртоАппараты", sortOrder: 60, color: "#ec4899" },
    { id: "kt_ortox", name: "ОртоАппараты x Хирургия", sortOrder: 70, color: "#f97316" },
    { id: "kt_post", name: "Постоянные", sortOrder: 80, color: "#ef4444" },
    { id: "kt_spl", name: "Сплинт", sortOrder: 90, color: "#3b82f6" },
    { id: "kt_splmrt", name: "Сплинт МРТ", sortOrder: 100, color: "#171717" },
    { id: "kt_hir", name: "Хирургия", sortOrder: 110, color: "#eab308" },
  ];
  return rows.map((t) => ({
    ...t,
    defaultTrackLane: defaultTrackLaneForCardTypeName(t.name),
  }));
}

export function cloneDefaultCardTypes(): CardTypeDef[] {
  return kaitenCardTypes().map((t) => ({ ...t }));
}

/** Событие после «Обновить ID из Kaiten» в конфигурации — канбан подтягивает типы из API. */
export const KANBAN_KAITEN_CARD_TYPES_SYNCED_EVENT =
  "dental-lab-kanban-kaiten-card-types-synced";

function isKaitenMirrorBoardId(boardId: string): boolean {
  return (
    boardId === KANBAN_BOARD_ORTHOPEDICS_ID ||
    boardId === KANBAN_BOARD_ORTHODONTICS_ID
  );
}

function mirrorBoardHasLegacyKtCardTypeIds(board: KanbanBoard): boolean {
  return (board.cardTypes || []).some((t) => String(t.id).startsWith("kt_"));
}

/** Типы из GET /api/kaiten-card-types (id из Prisma) + цвета по совпадению с локальным справочником имён. */
export function cardTypeDefsFromKaitenApiRows(
  rows: Array<{ id: string; name: string; sortOrder: number }>,
): CardTypeDef[] {
  const palette = [
    "#5b8cff",
    "#22c55e",
    "#06b6d4",
    "#92400e",
    "#2563eb",
    "#1f2937",
    "#ec4899",
    "#f97316",
    "#ef4444",
    "#3b82f6",
    "#171717",
    "#eab308",
  ];
  const staticByName = new Map(
    kaitenCardTypes().map((d) => [d.name.trim().toLowerCase(), d]),
  );
  return rows.map((r, i) => {
    const base = staticByName.get(String(r.name || "").trim().toLowerCase());
    const so = Number.isFinite(r.sortOrder) ? r.sortOrder : (i + 1) * 10;
    return {
      id: r.id,
      name: String(r.name || "").trim() || "Тип",
      sortOrder: so,
      color: base?.color ?? palette[i % palette.length]!,
    };
  });
}

/**
 * Подставляет типы с сервера на зеркальные доски Kaiten и перепривязывает cardTypeId карточек по имени типа.
 */
export function applyKaitenApiCardTypesToMirrorBoards(
  state: KanbanAppState,
  rows: Array<{ id: string; name: string; sortOrder: number }>,
): KanbanAppState {
  const next = structuredClone(state);
  const newTypes = cardTypeDefsFromKaitenApiRows(rows);
  if (newTypes.length === 0) return next;
  const newIds = new Set(newTypes.map((t) => t.id));
  const mirrorIds = [KANBAN_BOARD_ORTHOPEDICS_ID, KANBAN_BOARD_ORTHODONTICS_ID];
  const preserved = collectCardTypeDefaultLanes(
    mirrorIds.flatMap((bid) => {
      const b = next.boards.find((x) => x.id === bid);
      return b?.cardTypes ?? [];
    }),
  );
  for (const bid of mirrorIds) {
    const b = next.boards.find((x) => x.id === bid);
    if (!b) continue;
    const oldTypes = b.cardTypes ? [...b.cardTypes] : [];
    b.cardTypes = newTypes.map((t) => ({
      ...t,
      defaultTrackLane: pickPreservedCardTypeLane(t, preserved),
    }));
    for (const col of b.columns) {
      for (const c of col.cards) {
        if (!c.cardTypeId) continue;
        if (newIds.has(c.cardTypeId)) continue;
        const oldT = oldTypes.find((x) => x.id === c.cardTypeId);
        const nameKey = (oldT?.name || "").trim().toLowerCase();
        const hit = nameKey
          ? newTypes.find((x) => x.name.trim().toLowerCase() === nameKey)
          : undefined;
        c.cardTypeId = hit?.id ?? "";
      }
    }
  }
  return next;
}

export function normalizeBoardCardTypes(board: KanbanBoard) {
  if (!board.cardTypes || board.cardTypes.length === 0) {
    board.cardTypes = cloneDefaultCardTypes();
    return;
  }

  if (
    isKaitenMirrorBoardId(board.id) &&
    !mirrorBoardHasLegacyKtCardTypeIds(board)
  ) {
    const defs = kaitenCardTypes();
    const staticByName = new Map(
      defs.map((d) => [d.name.trim().toLowerCase(), d]),
    );
    for (const t of board.cardTypes) {
      const base = staticByName.get(String(t.name || "").trim().toLowerCase());
      const raw = t.color != null ? String(t.color).trim() : "";
      if (!raw || !/^#[0-9a-fA-F]{6}$/i.test(raw)) {
        t.color = (base && base.color) || "#5b8cff";
      } else {
        t.color = raw;
      }
      if (t.sortOrder == null) t.sortOrder = base?.sortOrder ?? 0;
      if (!t.name || !String(t.name).trim()) {
        t.name = base?.name || "Тип";
      }
      t.defaultTrackLane =
        String(t.defaultTrackLane || "").trim() ||
        defaultTrackLaneForCardTypeName(t.name);
    }
    board.cardTypes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return;
  }

  const defs = kaitenCardTypes();
  const defMap = new Map(defs.map((d) => [d.id, d]));
  const haveIds = new Set((board.cardTypes || []).map((t) => t.id));
  for (const d of defs) {
    if (!haveIds.has(d.id)) {
      board.cardTypes.push({ ...d });
      haveIds.add(d.id);
    }
  }
  board.cardTypes.forEach((t) => {
    const base = defMap.get(t.id);
    const raw = t.color != null ? String(t.color).trim() : "";
    if (!raw || !/^#[0-9a-fA-F]{6}$/.test(raw)) {
      t.color = (base && base.color) || "#5b8cff";
    } else {
      t.color = raw;
    }
    if (t.sortOrder == null) t.sortOrder = base?.sortOrder ?? 0;
    if (!t.name || !String(t.name).trim()) t.name = base?.name || "Тип";
    t.defaultTrackLane =
      String(t.defaultTrackLane || "").trim() ||
      defaultTrackLaneForCardTypeName(t.name);
  });
  board.cardTypes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

export function getCardTypeAccent(board: KanbanBoard, cardTypeId: string): string {
  if (!cardTypeId) return "#5ce1ff";
  const t = (board.cardTypes || []).find((x) => x.id === cardTypeId);
  const c = t && t.color ? String(t.color).trim() : "";
  if (c && /^#[0-9a-fA-F]{6}$/.test(c)) return c;
  const d = kaitenCardTypes().find((x) => x.id === cardTypeId);
  return (d && d.color) || "#5ce1ff";
}

/** Читаемый цвет текста (#fff / почти чёрный) поверх заливки акцентом типа (календарь и т.п.). */
export function textOnAccentHex(hex: string): "#ffffff" | "#0f172a" {
  const raw = String(hex || "").trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/i.test(raw)) return "#ffffff";
  const n = parseInt(raw, 16);
  const R = (n >> 16) & 255;
  const G = (n >> 8) & 255;
  const B = n & 255;
  const lin = (u: number) => {
    const c = u / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = lin(R);
  const g = lin(G);
  const b = lin(B);
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.5 ? "#0f172a" : "#ffffff";
}

/**
 * Тонкая оправа карточки на доске: акцент читается, без «неоновой» яркости.
 * Использует фон карточки темы, чтобы не выбиваться из полотна.
 */
export function kanbanTypeRingStyle(accentHex: string): Record<string, string> {
  const a = /^#[0-9a-fA-F]{6}$/i.test(String(accentHex).trim())
    ? String(accentHex).trim()
    : "#5ce1ff";
  const card = "var(--kanban-card-bg)";
  return {
    background: `linear-gradient(152deg,
      color-mix(in srgb, ${a} 12%, ${card}) 0%,
      color-mix(in srgb, ${a} 22%, ${card}) 22%,
      color-mix(in srgb, ${a} 34%, ${card}) 52%,
      color-mix(in srgb, ${a} 20%, ${card}) 100%)`,
    boxShadow: [
      `0 0 0 1px color-mix(in srgb, ${a} 22%, var(--kanban-border)) inset`,
      `0 -1px 3px color-mix(in srgb, ${a} 14%, rgba(15,23,42,0.08)) inset`,
      `0 1px 3px color-mix(in srgb, ${a} 12%, transparent)`,
    ].join(", "),
  };
}

export function cardInvolvesUser(card: KanbanCard, userId: string): boolean {
  if (!userId) return false;
  const a = card.assignees || [];
  const p = card.participants || [];
  return a.includes(userId) || p.includes(userId);
}

export function isCardBlocked(card: KanbanCard): boolean {
  return !!card.blocked;
}

export function actorUserId(board: KanbanBoard): string {
  return board.users?.[0]?.id ?? "";
}

export function performUnblock(
  card: KanbanCard,
  board: KanbanBoard,
  activityActorLabel?: string,
): void {
  card.blocked = false;
  card.blockReason = "";
  card.blockedByUserId = "";
  card.blockedAt = "";
  pushActivity(
    card,
    "Блокировка снята",
    actorUserId(board),
    board,
    activityActorLabel,
  );
}

/** Возвращает false, если причина пуста (нужно показать ошибку пользователю). */
export function tryBlockCard(
  card: KanbanCard,
  board: KanbanBoard,
  reason: string,
  activityActorLabel?: string,
): boolean {
  const r = (reason || "").trim();
  if (!r) return false;
  const uid = actorUserId(board);
  card.blocked = true;
  card.blockReason = r;
  card.blockedByUserId = uid;
  card.blockedAt = new Date().toISOString();
  pushActivity(
    card,
    "Карточка заблокирована: " + r.slice(0, 140),
    uid,
    board,
    activityActorLabel,
  );
  return true;
}

/**
 * Смена причины при уже установленной блокировке.
 * Не трогает blockedAt / blockedByUserId.
 */
export function updateKanbanBlockReason(
  card: KanbanCard,
  board: KanbanBoard,
  reason: string,
  activityActorLabel?: string,
): boolean {
  if (!card.blocked) return false;
  const r = (reason || "").trim();
  if (!r) return false;
  if (r === (card.blockReason || "").trim()) return true;
  card.blockReason = r;
  pushActivity(
    card,
    "Причина блокировки: " + r.slice(0, 140),
    actorUserId(board),
    board,
    activityActorLabel,
  );
  return true;
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** В JSON доски хранится срок в днях; в UI конфигурируют годы (×365). Макс. 30 лет. */
export function clampArchiveRetentionDays(raw: number | null | undefined): number {
  if (!Number.isFinite(raw)) return 365;
  const n = Math.round(Number(raw));
  if (n < 1) return 1;
  if (n > 365 * 30) return 365 * 30;
  return n;
}

function normalizeIdleHours(raw: number | null | undefined): number {
  if (!Number.isFinite(raw)) return 24;
  const n = Math.round(Number(raw));
  if (n < 1) return 1;
  if (n > 24 * 180) return 24 * 180;
  return n;
}

function cardArchiveRefAt(card: KanbanCard): Date {
  const raw = card.lastMovedAt || card.updatedAt || card.createdAt;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

function isLinkedOrderArchivedOnBoard(board: KanbanBoard, orderId: string): boolean {
  const key = orderId.trim();
  if (!key) return false;
  return (board.archivedCards || []).some((x) => x.card.linkedOrderId === key);
}

function archiveCardIntoBoard(input: {
  board: KanbanBoard;
  card: KanbanCard;
  sourceColumnId: string;
  sourceColumnTitle: string;
  now: Date;
  reason: "auto" | "manual";
}): void {
  const retentionDays = clampArchiveRetentionDays(input.board.archiveRetentionDays);
  const archivedAt = input.now.toISOString();
  const deleteAfterAt = new Date(
    input.now.getTime() + retentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  input.board.archivedCards = input.board.archivedCards || [];
  input.board.archivedCards.unshift({
    id: generateId("arch"),
    card: structuredClone(input.card),
    archivedAt,
    deleteAfterAt,
    sourceColumnId: input.sourceColumnId,
    sourceColumnTitle: input.sourceColumnTitle,
    reason: input.reason,
  });
}

export function archiveCardByIdOnBoard(
  board: KanbanBoard,
  cardId: string,
  reason: "auto" | "manual" = "manual",
): boolean {
  const now = new Date();
  for (const col of board.columns) {
    const ix = col.cards.findIndex((c) => c.id === cardId);
    if (ix < 0) continue;
    const card = col.cards[ix];
    if (!card) return false;
    col.cards.splice(ix, 1);
    archiveCardIntoBoard({
      board,
      card,
      sourceColumnId: col.id,
      sourceColumnTitle: col.title,
      now,
      reason,
    });
    return true;
  }
  return false;
}

export function stopCardByIdOnBoard(board: KanbanBoard, cardId: string): boolean {
  const now = new Date().toISOString();
  board.stoppedCards = board.stoppedCards || [];
  if (board.stoppedCards.some((row) => row.card.id === cardId)) return false;
  for (const col of board.columns) {
    const ix = col.cards.findIndex((c) => c.id === cardId);
    if (ix < 0) continue;
    const card = col.cards[ix];
    if (!card) return false;
    col.cards.splice(ix, 1);
    card.lastMovedAt = now;
    pushActivity(card, "Перемещена в «СТОП»", board.users[0]?.id, board);
    board.stoppedCards.unshift({
      id: generateId("stop"),
      card: structuredClone(card),
      stoppedAt: now,
      sourceColumnId: col.id,
      sourceColumnTitle: col.title,
    });
    return true;
  }
  return false;
}

export function restoreStoppedCardOnBoard(board: KanbanBoard, stoppedId: string): boolean {
  const list = board.stoppedCards || [];
  const ix = list.findIndex((x) => x.id === stoppedId || x.card.id === stoppedId);
  if (ix < 0) return false;
  const row = list[ix];
  if (!row) return false;
  list.splice(ix, 1);
  const col =
    board.columns.find((c) => c.id === row.sourceColumnId) ??
    board.columns.find(
      (c) => c.title.trim().toLowerCase() === row.sourceColumnTitle.trim().toLowerCase(),
    ) ??
    board.columns[0];
  if (!col) return false;
  const card = structuredClone(row.card);
  card.lastMovedAt = new Date().toISOString();
  pushActivity(card, `Возвращена из «СТОП» в «${col.title}»`, board.users[0]?.id, board);
  col.cards.unshift(card);
  return true;
}

export function restoreArchivedCardOnBoard(board: KanbanBoard, archivedId: string): boolean {
  const list = board.archivedCards || [];
  const ix = list.findIndex((x) => x.id === archivedId);
  if (ix < 0) return false;
  const row = list[ix];
  if (!row) return false;
  list.splice(ix, 1);
  const col =
    board.columns.find((c) => c.id === row.sourceColumnId) ??
    board.columns.find((c) => c.title.trim().toLowerCase() === row.sourceColumnTitle.trim().toLowerCase()) ??
    board.columns[0];
  if (!col) return false;
  col.cards.unshift(structuredClone(row.card));
  return true;
}

export function applyBoardArchivePolicies(
  board: KanbanBoard,
  now = new Date(),
): { archivedCount: number; deletedCount: number } {
  board.archivedCards = board.archivedCards || [];
  board.archiveRetentionDays = clampArchiveRetentionDays(board.archiveRetentionDays);
  board.autoArchiveRules = (board.autoArchiveRules || []).map((r) => ({
    id: r.id,
    enabled: r.enabled !== false,
    columnId: r.columnId,
    idleHours: normalizeIdleHours(r.idleHours),
  }));

  const beforeKeep = board.archivedCards.length;
  board.archivedCards = board.archivedCards.filter((x) => {
    const d = new Date(x.deleteAfterAt);
    return !Number.isNaN(d.getTime()) && d.getTime() > now.getTime();
  });
  const deletedCount = beforeKeep - board.archivedCards.length;

  let archivedCount = 0;
  for (const rule of board.autoArchiveRules) {
    if (!rule.enabled) continue;
    const col = board.columns.find((c) => c.id === rule.columnId);
    if (!col || col.cards.length === 0) continue;
    const thresholdMs = rule.idleHours * 60 * 60 * 1000;
    const keep: KanbanCard[] = [];
    for (const card of col.cards) {
      const ageMs = now.getTime() - cardArchiveRefAt(card).getTime();
      if (ageMs < thresholdMs) {
        keep.push(card);
        continue;
      }
      archiveCardIntoBoard({
        board,
        card,
        sourceColumnId: col.id,
        sourceColumnTitle: col.title,
        now,
        reason: "auto",
      });
      archivedCount += 1;
    }
    col.cards = keep;
  }

  return { archivedCount, deletedCount };
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Дата и время создания / события для шапки карточки */
export function formatDateTimeRu(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Сегодня по локальному календарю (как у `<input type="date">` и `isDueTomorrow`). */
export function localTodayISO(): string {
  const n = new Date();
  const y = n.getFullYear();
  const mo = n.getMonth() + 1;
  const d = n.getDate();
  return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function relativeTimeRu(iso: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  let s = Math.floor((Date.now() - t) / 1000);
  if (s < 0) return new Date(iso).toLocaleString("ru-RU");
  if (s < 45) return "только что";
  if (s < 3600) return `${Math.floor(s / 60)} мин. назад`;
  if (s < 86400) return `${Math.floor(s / 3600)} ч. назад`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} дн. назад`;
  return new Date(iso).toLocaleDateString("ru-RU");
}

export function formatBlockedAt(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function dueCategory(dueDate: string): "overdue" | "today" | "future" | "none" {
  if (!dueDate) return "none";
  const t = localTodayISO();
  if (dueDate < t) return "overdue";
  if (dueDate === t) return "today";
  return "future";
}

/**
 * Для колонки «Срок» в списке: красный текст, если срок просрочен или до его окончания
 * осталось не больше 24 часов (для даты YYYY-MM-DD — до конца календарного дня).
 */
export function isDueUrgentRedInList(dueDate: string): boolean {
  const raw = dueDate?.trim();
  if (!raw) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  let dueEndMs: number;
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    dueEndMs = new Date(y, mo - 1, d, 23, 59, 59, 999).getTime();
  } else {
    dueEndMs = new Date(raw).getTime();
  }
  if (!Number.isFinite(dueEndMs)) return false;
  const now = Date.now();
  if (dueEndMs < now) return true;
  return dueEndMs - now <= 24 * 60 * 60 * 1000;
}

export type DeadlineHintKind = "none" | "overdue" | "today" | "tomorrow";

/** Показывать декоративное напоминание в карточке: просрочено, срок сегодня или завтра. */
export function deadlineHintKind(dueDate: string | null | undefined): DeadlineHintKind {
  const raw = (dueDate || "").trim();
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "none";
  const today = localTodayISO();
  if (raw < today) return "overdue";
  if (raw === today) return "today";
  if (isDueTomorrow(raw)) return "tomorrow";
  return "none";
}

/** Дата срока — завтра по локальному календарю (ровно за день до «послезавтра»). */
export function isDueTomorrow(dueDate: string): boolean {
  const raw = (dueDate || "").trim();
  if (!raw) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return false;
  const due = new Date(y, mo - 1, d);
  if (Number.isNaN(due.getTime())) return false;
  const tom = new Date();
  tom.setHours(0, 0, 0, 0);
  tom.setDate(tom.getDate() + 1);
  return (
    due.getFullYear() === tom.getFullYear() &&
    due.getMonth() === tom.getMonth() &&
    due.getDate() === tom.getDate()
  );
}

/** Старые демо-id из первых версий канбана — удаляются при миграции. */
const LEGACY_DEMO_USER_IDS = new Set([
  "user1",
  "user2",
  "user3",
  "user4",
]);

function stripLegacyDemoUsers(board: KanbanBoard) {
  board.users = (board.users || []).filter((u) => !LEGACY_DEMO_USER_IDS.has(u.id));
  const isLegacyId = (id: string) => LEGACY_DEMO_USER_IDS.has(id);
  board.columns.forEach((col) => {
    col.cards.forEach((c) => {
      c.assignees = (c.assignees || []).filter((id) => !isLegacyId(id));
      c.participants = (c.participants || []).filter((id) => !isLegacyId(id));
      if (c.createdByUserId && isLegacyId(c.createdByUserId)) c.createdByUserId = "";
      if (c.blockedByUserId && isLegacyId(c.blockedByUserId)) c.blockedByUserId = "";
      (c.comments || []).forEach((cm) => {
        if (cm.userId && isLegacyId(cm.userId)) cm.userId = "";
      });
      (c.activity || []).forEach((a) => {
        if (a.userId && isLegacyId(a.userId)) a.userId = "";
      });
      (c.files || []).forEach((f) => {
        if (f.addedByUserId && isLegacyId(f.addedByUserId)) f.addedByUserId = "";
      });
    });
  });
}

export function createCard(partial: Partial<KanbanCard> & { id?: string }): KanbanCard {
  const now = new Date().toISOString();
  return {
    id: partial.id || generateId("card"),
    title: partial.title || "Новая задача",
    description: partial.description || "",
    ...(partial.linkedOrderId
      ? {
          linkedOrderId: partial.linkedOrderId,
          kaitenCardId: partial.kaitenCardId ?? null,
          ...(partial.linkedOrderNumber
            ? { linkedOrderNumber: partial.linkedOrderNumber }
            : {}),
          ...(partial.kaitenCardSortOrder !== undefined
            ? { kaitenCardSortOrder: partial.kaitenCardSortOrder }
            : {}),
        }
      : {}),
    cardTypeId: partial.cardTypeId != null ? partial.cardTypeId : "",
    assignees: partial.assignees || [],
    participants: partial.participants || [],
    stageDueDate: partial.stageDueDate ?? "",
    dueDate: "",
    urgent: !!partial.urgent,
    checklist: Array.isArray(partial.checklist)
      ? partial.checklist.map((row) => ({
          ...row,
          completedAt: row.completed ? row.completedAt ?? null : null,
        }))
      : [],
    files: Array.isArray(partial.files) ? partial.files : [],
    comments: (partial.comments || []).map((cm) => ({
      ...cm,
      parentId: cm.parentId ?? null,
      externalCommentId: cm.externalCommentId ?? null,
      externalParentId: cm.externalParentId ?? null,
      source: cm.source === "KAITEN" ? "KAITEN" : "CRM",
      syncStatus:
        cm.syncStatus === "pending" ||
        cm.syncStatus === "synced" ||
        cm.syncStatus === "failed" ||
        cm.syncStatus === "retried" ||
        cm.syncStatus === "local"
          ? cm.syncStatus
          : "local",
      syncedAt: cm.syncedAt ?? null,
    })),
    activity: partial.activity || [],
    blocked: !!partial.blocked,
    blockReason: partial.blockReason != null ? String(partial.blockReason) : "",
    blockedByUserId: partial.blockedByUserId != null ? partial.blockedByUserId : "",
    blockedAt: partial.blockedAt != null ? partial.blockedAt : "",
    createdByUserId: partial.createdByUserId != null ? partial.createdByUserId : "",
    lastMovedAt: partial.lastMovedAt != null ? partial.lastMovedAt : null,
    trackLane: partial.trackLane != null ? partial.trackLane : "",
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
    parentCardId: partial.parentCardId || undefined,
    childCardIds: Array.isArray(partial.childCardIds) ? partial.childCardIds : [],
    productionLaneId: partial.productionLaneId || undefined,
    productionChecklist: Array.isArray(partial.productionChecklist)
      ? partial.productionChecklist.map((row) => ({
          ...row,
          completedAt: row.completed ? row.completedAt ?? null : null,
        }))
      : [],
    productionChecklistSnapshots: Array.isArray(partial.productionChecklistSnapshots)
      ? partial.productionChecklistSnapshots.map((row) => ({
          ...row,
          checklist: Array.isArray(row.checklist)
            ? row.checklist.map((item) => ({
                ...item,
                completedAt: item.completed ? item.completedAt ?? null : null,
              }))
            : [],
        }))
      : [],
    productionReadyAt:
      partial.productionReadyAt === undefined ? null : partial.productionReadyAt,
    timerStartedAt:
      partial.timerStartedAt === undefined ? null : partial.timerStartedAt ?? null,
    timerDurationMs:
      partial.timerDurationMs === undefined ? null : partial.timerDurationMs ?? null,
    timerFrozenAt:
      partial.timerFrozenAt === undefined ? null : partial.timerFrozenAt ?? null,
  };
}

export function migrateBoard(board: KanbanBoard): KanbanBoard {
  if (!board || !board.columns) return board;
  if (typeof board.distributeNewOrders !== "boolean") {
    board.distributeNewOrders = defaultDistributeNewOrdersByBoardId(board.id);
  }
  if (typeof board.isPrivate !== "boolean") board.isPrivate = false;
  if (typeof board.allowProductionRoleAccess !== "boolean") {
    board.allowProductionRoleAccess = false;
  }
  if (!Array.isArray(board.accessUserIds)) board.accessUserIds = [];
  if (!Array.isArray(board.autoArchiveRules)) board.autoArchiveRules = [];
  if (!Array.isArray(board.archivedCards)) board.archivedCards = [];
  if (!Array.isArray(board.stoppedCards)) board.stoppedCards = [];
  if (!board.productionSettings || typeof board.productionSettings !== "object") {
    board.productionSettings = {
      enabled: true,
      triggerColumnTitle: "Производство",
      parentDoneColumnTitle: "Сборка",
      childTodoColumnTitle: "К исполнению",
      childInProgressColumnTitle: "В работе",
      childDoneColumnTitle: "Готово",
      unmatchedLaneId: "lane_unsorted",
      childAutoArchiveAfterMinutes: 15,
      archive3dExtensions: [".stl", ".ply", ".obj"],
      lanes: [
        {
          id: "lane_print",
          name: "Печать",
          keywords: ["модель", "модели", "моделька", "штампик", "штампики"],
        },
        {
          id: "lane_mill",
          name: "Фрезер",
          keywords: ["сплинт", "фрезер", "фрезеровка"],
        },
        { id: "lane_unsorted", name: "Не распределено", keywords: [] },
      ],
    };
  }
  if (!Array.isArray(board.excludedCrmUserIds)) board.excludedCrmUserIds = [];
  board.excludedCrmUserIds = board.excludedCrmUserIds
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  board.archiveRetentionDays = clampArchiveRetentionDays(board.archiveRetentionDays);
  board.accessUserIds = board.accessUserIds
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  migrateBoardColumnsToKaitenMirror(board);
  const kt = kaitenCardTypes();
  const byName = new Map(kt.map((t) => [t.name.toLowerCase(), t.id]));
  normalizeBoardCardTypes(board);
  if ((board as unknown as { labels?: unknown[] }).labels?.length) {
    const labels = (board as unknown as { labels: { text?: string; name?: string }[] }).labels;
    board.columns.forEach((col) => {
      col.cards.forEach((c) => {
        const legacy = c as unknown as { labels?: { text?: string; name?: string }[] };
        if (legacy.labels && legacy.labels.length && !c.cardTypeId) {
          const raw = legacy.labels[0];
          const nm = String(raw.text || raw.name || "").toLowerCase().trim();
          c.cardTypeId = byName.get(nm) || "";
        }
      });
    });
  }
  delete (board as unknown as { labels?: unknown }).labels;
  board.columns.forEach((col) => {
    delete (col as unknown as { wipLimit?: unknown }).wipLimit;
    delete (col as unknown as { headerColor?: unknown }).headerColor;
    col.cards.forEach((c) => {
      delete (c as unknown as { labels?: unknown }).labels;
      if (!Array.isArray(c.files)) c.files = [];
      delete (c as unknown as { attachments?: unknown }).attachments;
      delete (c as unknown as { cardColor?: unknown }).cardColor;
      if (!Array.isArray(c.participants)) c.participants = [];
      const legacy = c as unknown as { locked?: boolean };
      if (c.blocked == null) {
        if (legacy.locked) {
          c.blocked = true;
          if (c.blockReason == null || c.blockReason === "") c.blockReason = "";
          if (!c.blockedByUserId && board.users && board.users[0])
            c.blockedByUserId = board.users[0].id;
          if (!c.blockedAt) c.blockedAt = c.updatedAt || new Date().toISOString();
        } else {
          c.blocked = false;
          if (c.blockReason == null) c.blockReason = "";
          if (c.blockedByUserId == null) c.blockedByUserId = "";
          if (c.blockedAt == null) c.blockedAt = "";
        }
      } else {
        if (c.blockReason == null) c.blockReason = "";
        if (c.blockedByUserId == null) c.blockedByUserId = "";
        if (c.blockedAt == null) c.blockedAt = "";
      }
      delete legacy.locked;
      if (c.blocked && !(c.blockReason || "").trim()) {
        c.blockReason = "Без указания причины";
      }
      if (!c.createdByUserId && board.users && board.users[0])
        c.createdByUserId = board.users[0].id;
      if (c.trackLane == null) c.trackLane = "";
      if (c.lastMovedAt === undefined) c.lastMovedAt = null;
      if (typeof c.urgent !== "boolean") c.urgent = false;
      if (!Array.isArray(c.childCardIds)) c.childCardIds = [];
      if (!Array.isArray(c.productionChecklist)) c.productionChecklist = [];
      if (!Array.isArray(c.productionChecklistSnapshots)) c.productionChecklistSnapshots = [];
      if (c.productionReadyAt === undefined) c.productionReadyAt = null;
      c.checklist = (c.checklist || []).map((item) => ({
        ...item,
        completedAt: item.completed ? item.completedAt ?? null : null,
      }));
      c.productionChecklist = (c.productionChecklist || []).map((item) => ({
        ...item,
        completedAt: item.completed ? item.completedAt ?? null : null,
      }));
      c.productionChecklistSnapshots = (c.productionChecklistSnapshots || []).map((row) => ({
        ...row,
        checklist: (row.checklist || []).map((item) => ({
          ...item,
          completedAt: item.completed ? item.completedAt ?? null : null,
        })),
      }));
      c.comments = (c.comments || []).map((cm) => ({
        ...cm,
        parentId: cm.parentId ?? null,
        externalCommentId: cm.externalCommentId ?? null,
        externalParentId: cm.externalParentId ?? null,
        source: cm.source === "KAITEN" ? "KAITEN" : "CRM",
        syncStatus:
          cm.syncStatus === "pending" ||
          cm.syncStatus === "synced" ||
          cm.syncStatus === "failed" ||
          cm.syncStatus === "retried" ||
          cm.syncStatus === "local"
            ? cm.syncStatus
            : "local",
        syncedAt: cm.syncedAt ?? null,
      }));
      (c.files || []).forEach((f) => {
        if (!f.addedAt) f.addedAt = c.updatedAt || new Date().toISOString();
        if (!f.addedByUserId && board.users && board.users[0])
          f.addedByUserId = board.users[0].id;
        if (typeof f.productionRedo !== "boolean") f.productionRedo = false;
      });
    });
  });
  const legacyDays = Number(
    (
      board.productionSettings as Partial<{
        childAutoArchiveAfterDays: unknown;
      }>
    )?.childAutoArchiveAfterDays,
  );
  const rawMinutes = Number(
    (
      board.productionSettings as Partial<{
        childAutoArchiveAfterMinutes: unknown;
      }>
    )?.childAutoArchiveAfterMinutes,
  );
  const nextMinutes = Number.isFinite(rawMinutes)
    ? rawMinutes
    : Number.isFinite(legacyDays)
      ? legacyDays * 24 * 60
      : 15;
  board.productionSettings.childAutoArchiveAfterMinutes = Math.max(0, Math.round(nextMinutes));
  stripLegacyDemoUsers(board);
  if (!Array.isArray(board.automations)) {
    board.automations = [];
  } else {
    board.automations = board.automations
      .filter((r) => r && typeof r.id === "string")
      .map((r) => ({
        ...r,
        boardId: String(r.boardId || board.id),
      }));
  }
  board.autoArchiveRules = (board.autoArchiveRules || [])
    .filter((r) => r && typeof r.id === "string")
    .map((r) => ({
      id: String(r.id),
      enabled: r.enabled !== false,
      columnId: String(r.columnId || ""),
      idleHours: normalizeIdleHours(r.idleHours),
    }))
    .filter((r) => (board.columns || []).some((c) => c.id === r.columnId));
  board.archivedCards = (board.archivedCards || []).filter((x) => {
    if (!x || typeof x.id !== "string" || !x.card) return false;
    return true;
  }) as KanbanArchivedCard[];
  board.stoppedCards = (board.stoppedCards || []).filter((x) => {
    if (!x || typeof x.id !== "string" || !x.card) return false;
    return true;
  }) as KanbanStoppedCard[];
  return board;
}

/** Колонки с id, уникальными в пределах доски (важно при нескольких досках в одном состоянии). */
export function createBoardShell(boardId: string, title: string): KanbanBoard {
  const users: KanbanBoard["users"] = [];
  const cardTypes = cloneDefaultCardTypes();

  const columns: KanbanColumn[] = buildKaitenMirrorColumnsForBoard(boardId);

  columns.forEach((col, ci) => {
    col.cards.forEach((card, i) => {
      if (!card.createdByUserId) card.createdByUserId = "";
      if (!card.trackLane)
        card.trackLane = (ci + i) % 2 === 0 ? "ORTHOPEDICS" : "ORTHODONTICS";
      if (!card.activity || !card.activity.length) {
        card.activity = [
          {
            id: generateId("act"),
            type: "create",
            text: "Карточка создана",
            userId: card.createdByUserId,
            at: card.createdAt,
          },
        ];
      }
    });
  });

  return {
    id: boardId,
    title,
    distributeNewOrders: defaultDistributeNewOrdersByBoardId(boardId),
    isPrivate: false,
    allowProductionRoleAccess: false,
    accessUserIds: [],
    columns,
    users,
    cardTypes,
    automations: [],
    autoArchiveRules: [],
    excludedCrmUserIds: [],
    archiveRetentionDays: 365,
    archivedCards: [],
    stoppedCards: [],
    productionSettings: {
      enabled: true,
      triggerColumnTitle: "Производство",
      parentDoneColumnTitle: "Сборка",
      childTodoColumnTitle: "К исполнению",
      childInProgressColumnTitle: "В работе",
      childDoneColumnTitle: "Готово",
      unmatchedLaneId: "lane_unsorted",
      childAutoArchiveAfterMinutes: 15,
      archive3dExtensions: [".stl", ".ply", ".obj"],
      lanes: [
        {
          id: "lane_print",
          name: "Печать",
          keywords: ["модель", "модели", "моделька", "штампик", "штампики"],
        },
        {
          id: "lane_mill",
          name: "Фрезер",
          keywords: ["сплинт", "фрезер", "фрезеровка"],
        },
        { id: "lane_unsorted", name: "Не распределено", keywords: [] },
      ],
    },
  };
}

export function createInitialBoard(): KanbanBoard {
  return createBoardShell(generateId("board"), "Рабочая доска");
}

function normalizeBoardTitleForSystemLookup(title: string | null | undefined): string {
  return String(title || "").trim().toLowerCase();
}

/**
 * Снимок для client-state.
 * Tenant: только доски/карточки (персональный UI — в user kanbanBoardUiV1).
 * Demo: полный state в user-scope, поиск по-прежнему не персистим.
 * Тяжёлые тексты (описание/чат/activity) ужимаем — иначе PUT ~МБ → 500 и лавина ошибок.
 */
export function kanbanStateForPersistence(
  state: KanbanAppState,
  isDemo = false,
): KanbanAppState {
  return kanbanStateForPersistenceUnderLimit(state, isDemo);
}

const PERSIST_DESC_MAX = 120;
/** Чат зеркалится в наряде/Kaiten — в tenant JSON не тащим. */
const PERSIST_COMMENTS_KEEP = 0;
const PERSIST_ACTIVITY_KEEP = 2;
const PERSIST_FILES_KEEP = 6;
const PERSIST_ARCHIVE_DESC_MAX = 40;
const PERSIST_ARCHIVE_ROWS_KEEP = 30;
const PERSIST_STOPPED_ROWS_KEEP = 30;
/** Цель: JSON {scope,key,value} < CLIENT_STATE_MAX (600KB). */
const PERSIST_TARGET_JSON_BYTES = 560_000;

function slimProductionSnapshots(
  card: KanbanCard,
  dropEntirely: boolean,
): void {
  if (!Array.isArray(card.productionChecklistSnapshots)) return;
  if (dropEntirely) {
    card.productionChecklistSnapshots = [];
    return;
  }
  card.productionChecklistSnapshots = card.productionChecklistSnapshots
    .slice(-3)
    .map((row) => ({
      ...row,
      checklist: (row.checklist || []).slice(0, 40).map((item) => ({
        ...item,
        text:
          typeof item.text === "string" && item.text.length > 80
            ? `${item.text.slice(0, 80)}…`
            : item.text,
        reworkEvents: undefined,
      })),
    }));
}

function stripInlineFileDataUrl(f: CardFile): CardFile {
  const d = f.dataUrl || "";
  if (d.startsWith("data:")) {
    return { ...f, dataUrl: "" };
  }
  return f;
}

function slimCardFiles(card: KanbanCard, archiveLike: boolean, keep: number): void {
  if (!Array.isArray(card.files) || card.files.length === 0) return;
  /* Вложения наряда — короткие URL. Их нельзя резать: persist/poll иначе мерцает. */
  const orderFiles = (card.files || [])
    .filter((f) => Boolean(f.orderAttachmentId))
    .map(stripInlineFileDataUrl);
  const localFiles = (card.files || []).filter((f) => !f.orderAttachmentId);
  if (archiveLike) {
    card.files = [];
    return;
  }
  if (keep <= 0) {
    card.files = card.linkedOrderId ? orderFiles : [];
    return;
  }
  const slimLocal = localFiles.slice(-keep).map(stripInlineFileDataUrl);
  card.files = [...orderFiles, ...slimLocal];
}

/** Ужимает карточки перед записью в TenantClientState / UserClientState. */
export function slimKanbanStateForClientState(
  state: KanbanAppState,
  level: 0 | 1 | 2 | 3 = 0,
): KanbanAppState {
  const next = structuredClone(state);

  const commentsKeep = level >= 1 ? 0 : PERSIST_COMMENTS_KEEP;
  const activityKeep = level >= 1 ? 0 : PERSIST_ACTIVITY_KEEP;
  const filesKeep = level >= 2 ? 0 : level >= 1 ? 2 : PERSIST_FILES_KEEP;
  const descMax =
    level >= 2 ? 60 : level >= 1 ? 80 : PERSIST_DESC_MAX;
  const archiveKeep =
    level >= 3 ? 0 : level >= 2 ? 10 : level >= 1 ? 20 : PERSIST_ARCHIVE_ROWS_KEEP;
  const stoppedKeep =
    level >= 3 ? 0 : level >= 2 ? 10 : level >= 1 ? 20 : PERSIST_STOPPED_ROWS_KEEP;
  const dropSnapshots = level >= 1;

  const slimCard = (card: KanbanCard, archiveLike = false) => {
    // Описание наряда живёт в Order / linked-orders merge — в tenant JSON не храним
    // обрезок (раньше slice(0,120)+"…" выглядел как «пропало описание»).
    if (card.linkedOrderId) {
      card.description = "";
    } else {
      const dMax = archiveLike ? PERSIST_ARCHIVE_DESC_MAX : descMax;
      if (
        typeof card.description === "string" &&
        card.description.length > dMax
      ) {
        card.description = card.description.slice(0, dMax) + "…";
      }
    }
    // data:URL (скриншоты/файлы из чата) — главный раздуватель JSON (~МБ → 500 на PUT).
    slimCardFiles(card, archiveLike, archiveLike ? 0 : filesKeep);
    slimProductionSnapshots(card, archiveLike || dropSnapshots);
    if (Array.isArray(card.productionChecklist) && card.productionChecklist.length > 0) {
      card.productionChecklist = card.productionChecklist.slice(0, level >= 2 ? 20 : 60).map(
        (item) => ({
          ...item,
          reworkEvents: undefined,
          text:
            typeof item.text === "string" && item.text.length > 100
              ? `${item.text.slice(0, 100)}…`
              : item.text,
        }),
      );
    }
    if (archiveLike) {
      card.comments = [];
      card.activity = [];
      return;
    }
    if (commentsKeep <= 0) {
      card.comments = [];
    } else if (Array.isArray(card.comments) && card.comments.length > 0) {
      card.comments = card.comments.slice(-commentsKeep).map((cm) => {
        const text =
          typeof cm.text === "string" && cm.text.length > 80
            ? cm.text.slice(0, 80) + "…"
            : cm.text;
        return { ...cm, text };
      });
    }
    if (activityKeep <= 0) {
      card.activity = [];
    } else if (Array.isArray(card.activity) && card.activity.length > activityKeep) {
      card.activity = card.activity.slice(-activityKeep);
    }
    if (typeof card.kaitenMembersSyncWarning === "string" && level >= 1) {
      card.kaitenMembersSyncWarning = null;
    }
  };

  for (const board of next.boards) {
    for (const col of board.columns || []) {
      for (const card of col.cards || []) slimCard(card, false);
    }
    if (Array.isArray(board.archivedCards) && board.archivedCards.length > archiveKeep) {
      board.archivedCards = board.archivedCards.slice(-archiveKeep);
    }
    if (Array.isArray(board.stoppedCards) && board.stoppedCards.length > stoppedKeep) {
      board.stoppedCards = board.stoppedCards.slice(-stoppedKeep);
    }
    for (const row of board.archivedCards || []) {
      if (row?.card) slimCard(row.card, true);
    }
    for (const row of board.stoppedCards || []) {
      if (row?.card) slimCard(row.card, true);
    }
  }
  return next;
}

/**
 * Slim + при необходимости более жёсткие уровни, пока payload не влезет в лимит PUT.
 */
export function kanbanStateForPersistenceUnderLimit(
  state: KanbanAppState,
  isDemo = false,
  maxBytes = PERSIST_TARGET_JSON_BYTES,
): KanbanAppState {
  const base = isDemo
    ? { ...state, search: "" }
    : stripPersonalKanbanUiForTenant(state);

  let best = slimKanbanStateForClientState(base, 0);
  for (const level of [0, 1, 2, 3] as const) {
    const candidate =
      level === 0 ? best : slimKanbanStateForClientState(base, level);
    best = candidate;
    const sized = clientStatePayloadTooLarge(
      isDemo ? "user" : "tenant",
      isDemo ? "kanbanAppStateV3Demo" : "kanbanAppStateV3",
      candidate,
      maxBytes,
    );
    if (!sized.tooLarge) return candidate;
  }
  return best;
}

export function mergeKanbanStatePreservingLocalBoards(
  localState: KanbanAppState,
  remoteState: KanbanAppState,
): KanbanAppState {
  const merged = structuredClone(remoteState);
  // Персональный UI всегда с локальной сессии — remote tenant не должен его затирать.
  merged.search = localState.search ?? "";
  merged.filters = structuredClone(localState.filters);
  merged.filterTemplates = structuredClone(localState.filterTemplates ?? []);
  merged.viewMode = localState.viewMode ?? "board";
  merged.calendarMonth = structuredClone(
    localState.calendarMonth ?? merged.calendarMonth,
  );
  merged.activeBoardId = localState.activeBoardId;
  const remoteById = new Set(merged.boards.map((b) => b.id));
  const remoteByTitle = new Set(
    merged.boards.map((b) => normalizeBoardTitleForSystemLookup(b.title)),
  );
  for (const localBoard of localState.boards) {
    const titleKey = normalizeBoardTitleForSystemLookup(localBoard.title);
    if (remoteById.has(localBoard.id)) continue;
    if (titleKey && remoteByTitle.has(titleKey)) continue;
    merged.boards.push(structuredClone(localBoard));
    remoteById.add(localBoard.id);
    if (titleKey) remoteByTitle.add(titleKey);
  }
  const localBoardById = new Map(localState.boards.map((b) => [b.id, b]));
  for (const board of merged.boards) {
    const localBoard = localBoardById.get(board.id);
    if (!localBoard?.cardTypes?.length || !board.cardTypes?.length) continue;
    board.cardTypes = mergeCardTypeDefsKeepingLanes(
      board.cardTypes,
      localBoard.cardTypes,
    );
  }
  const hasActiveBoard =
    merged.boards.some((b) => b.id === merged.activeBoardId) ||
    isKanbanAggregateBoardId(merged.activeBoardId);
  if (!hasActiveBoard) {
    if (
      localState.boards.some((b) => b.id === localState.activeBoardId) ||
      isKanbanAggregateBoardId(localState.activeBoardId)
    ) {
      merged.activeBoardId = localState.activeBoardId;
    } else if (merged.boards[0]) {
      merged.activeBoardId = merged.boards[0].id;
    }
  }
  return merged;
}

export function ensureProductionBoardInState(
  state: KanbanAppState,
  sourceBoard?: KanbanBoard | null,
): KanbanBoard {
  const source =
    sourceBoard ??
    state.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID) ??
    state.boards.find((b) => b.id !== KANBAN_BOARD_PRODUCTION_ID) ??
    state.boards[0];
  const sourceSettings = source?.productionSettings ?? createBoardShell("production-template", "Template").productionSettings!;
  const lanes = sourceSettings.lanes?.length
    ? sourceSettings.lanes
    : [{ id: "lane_print", name: "Печать", keywords: [] }];
  const neededTitles: string[] = [];
  for (const lane of lanes) {
    neededTitles.push(`${lane.name} · ${sourceSettings.childTodoColumnTitle}`);
    neededTitles.push(`${lane.name} · ${sourceSettings.childInProgressColumnTitle}`);
    neededTitles.push(`${lane.name} · ${sourceSettings.childDoneColumnTitle}`);
  }

  let board =
    state.boards.find((b) => b.id === KANBAN_BOARD_PRODUCTION_ID) ??
    state.boards.find((b) => normalizeBoardTitleForSystemLookup(b.title) === "производство");
  if (!board) {
    board = {
      id: KANBAN_BOARD_PRODUCTION_ID,
      title: "Производство",
      isPrivate: false,
      allowProductionRoleAccess: true,
      accessUserIds: [],
      columns: neededTitles.map((title) => ({ id: generateId("col"), title, cards: [] })),
      users: structuredClone(source?.users || []),
      excludedCrmUserIds: structuredClone(source?.excludedCrmUserIds || []),
      cardTypes: structuredClone(source?.cardTypes || cloneDefaultCardTypes()),
      automations: [],
      autoArchiveRules: [],
      archiveRetentionDays: source?.archiveRetentionDays ?? 365,
      archivedCards: [],
      productionSettings: structuredClone(sourceSettings),
    };
    state.boards.push(board);
    return board;
  }

  if (board.id !== KANBAN_BOARD_PRODUCTION_ID) {
    const oldId = board.id;
    board.id = KANBAN_BOARD_PRODUCTION_ID;
    if (state.activeBoardId === oldId) state.activeBoardId = KANBAN_BOARD_PRODUCTION_ID;
  }
  board.title = board.title?.trim() || "Производство";
  board.isPrivate = false;
  board.allowProductionRoleAccess = true;
  if (!Array.isArray(board.accessUserIds)) board.accessUserIds = [];
  if (!Array.isArray(board.columns)) board.columns = [];
  const existingTitles = new Set(
    board.columns.map((col) => String(col.title || "").trim().toLowerCase()),
  );
  for (const title of neededTitles) {
    const key = title.trim().toLowerCase();
    if (existingTitles.has(key)) continue;
    board.columns.push({ id: generateId("col"), title, cards: [] });
    existingTitles.add(key);
  }
  board.productionSettings = structuredClone(sourceSettings);
  if (!Array.isArray(board.users)) board.users = structuredClone(source?.users || []);
  if (!Array.isArray(board.excludedCrmUserIds)) {
    board.excludedCrmUserIds = structuredClone(source?.excludedCrmUserIds || []);
  }
  if (!Array.isArray(board.cardTypes)) board.cardTypes = structuredClone(source?.cardTypes || cloneDefaultCardTypes());
  if (!Array.isArray(board.automations)) board.automations = [];
  if (!Array.isArray(board.autoArchiveRules)) board.autoArchiveRules = [];
  if (!Array.isArray(board.archivedCards)) board.archivedCards = [];
  board.archiveRetentionDays = board.archiveRetentionDays ?? source?.archiveRetentionDays ?? 365;
  return board;
}

export function defaultAppState(): KanbanAppState {
  const ortho = createBoardShell(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия");
  const odon = createBoardShell(KANBAN_BOARD_ORTHODONTICS_ID, "Ортодонтия");
  const productionState = {
    version: 2,
    boards: [ortho, odon],
    activeBoardId: ortho.id,
    search: "",
    viewMode: "board",
    calendarMonth: { y: new Date().getFullYear(), m: new Date().getMonth() },
    filters: {
      cardTypeId: "",
      due: "",
      assigneeUserId: "",
      participantUserId: "",
    },
    filterTemplates: [],
    hiddenLinkedOrderIds: [],
  } as KanbanAppState;
  ensureProductionBoardInState(productionState, ortho);
  const now = new Date();
  return {
    version: 2,
    boards: productionState.boards,
    activeBoardId: ortho.id,
    search: "",
    viewMode: "board",
    calendarMonth: { y: now.getFullYear(), m: now.getMonth() },
    filters: {
      cardTypeId: "",
      due: "",
      assigneeUserId: "",
      participantUserId: "",
    },
    filterTemplates: [],
    hiddenLinkedOrderIds: [],
  };
}

/**
 * Демо-сессия: одна доска «Работы», карточки без привязки к наряду (linkedOrderId) удаляются.
 */
export function normalizeDemoKanbanAppState(state: KanbanAppState): KanbanAppState {
  const next = structuredClone(state);
  const pick =
    next.boards.find((b) => b.id === next.activeBoardId) ?? next.boards[0];
  if (!pick) {
    const b = createInitialBoard();
    b.title = "Работы";
    b.cardTypes = demoKanbanPriceCardTypes();
    migrateBoard(b);
    next.boards = [b];
    next.activeBoardId = b.id;
    return next;
  }
  migrateBoard(pick);
  pick.title = "Работы";
  pick.cardTypes = demoKanbanPriceCardTypes();
  for (const col of pick.columns) {
    col.cards = (col.cards || []).filter((c) => Boolean(c.linkedOrderId));
  }
  normalizeBoardCardTypes(pick);
  next.boards = [pick];
  next.activeBoardId = pick.id;
  return next;
}

/** Начальное состояние канбана для демо (одна доска «Работы», без лишних карточек). */
export function demoKanbanDefaultState(): KanbanAppState {
  return normalizeDemoKanbanAppState(defaultAppState());
}

export function loadKanbanState(isDemo = false): KanbanAppState {
  if (typeof window === "undefined") return defaultAppState();
  try {
    let raw = isDemo ? memoryStateRawDemo : memoryStateRawLive;
    if (!raw) return defaultAppState();
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data.boards || !Array.isArray(data.boards)) return defaultAppState();
    const merged = { ...defaultAppState(), ...data } as KanbanAppState & {
      theme?: string;
    };
    delete merged.theme;
    merged.boards = merged.boards.map((b) => migrateBoard(b));
    merged.filters = {
      ...defaultAppState().filters,
      ...(merged.filters || {}),
    };
    const f = merged.filters as {
      labelId?: string;
      userId?: string;
    };
    if (f.labelId != null && merged.filters.cardTypeId == null) {
      merged.filters.cardTypeId = f.labelId;
    }
    delete f.labelId;
    delete (merged.filters as { labelId?: string }).labelId;
    if (merged.filters.cardTypeId == null) merged.filters.cardTypeId = "";
    if (merged.filters.due == null) merged.filters.due = "";
    if (merged.filters.assigneeUserId == null) merged.filters.assigneeUserId = "";
    if (merged.filters.participantUserId == null) merged.filters.participantUserId = "";
    if (f.userId && !merged.filters.assigneeUserId && !merged.filters.participantUserId) {
      merged.filters.assigneeUserId = String(f.userId);
    }
    delete (merged.filters as { userId?: string }).userId;
    if (!merged.filterTemplates || !Array.isArray(merged.filterTemplates)) {
      merged.filterTemplates = [];
    }
    if (!Array.isArray(merged.hiddenLinkedOrderIds)) {
      merged.hiddenLinkedOrderIds = [];
    }
    merged.filterTemplates = merged.filterTemplates
      .filter((t) => t && typeof t.id === "string" && typeof t.name === "string" && t.filters)
      .map((t) => ({
        id: t.id,
        name: t.name,
        filters: {
          cardTypeId: t.filters.cardTypeId ?? "",
          due: t.filters.due ?? "",
          assigneeUserId: t.filters.assigneeUserId ?? "",
          participantUserId: t.filters.participantUserId ?? "",
        },
      }));
    if (!merged.viewMode) merged.viewMode = "board";
    if (merged.viewMode !== "board" && merged.viewMode !== "calendar" && merged.viewMode !== "list") {
      merged.viewMode = "board";
    }
    if (!merged.calendarMonth) {
      const n = new Date();
      merged.calendarMonth = { y: n.getFullYear(), m: n.getMonth() };
    }
    if (!isDemo) {
      ensureMirroredKanbanBoardsForKaiten(merged);
      ensureProductionBoardInState(merged);
      const migrated = applyKanbanLegacyStageDueClearMigration(merged);
      return migrated.state;
    }
    return merged;
  } catch {
    return defaultAppState();
  }
}

export function saveKanbanState(state: KanbanAppState, isDemo = false) {
  const raw = JSON.stringify(state);
  if (isDemo) {
    memoryStateRawDemo = raw;
    return;
  }
  memoryStateRawLive = raw;
}

export function getActiveBoard(state: KanbanAppState): KanbanBoard {
  const found = state.boards.find((b) => b.id === state.activeBoardId);
  if (found) return found;
  const t = getKanbanLayoutTemplateBoard(state);
  if (state.activeBoardId === KANBAN_BOARD_MY_CARDS_ID) {
    return { ...t, id: KANBAN_BOARD_MY_CARDS_ID, title: "Мои" };
  }
  if (state.activeBoardId === KANBAN_BOARD_DISTRIBUTE_ID) {
    return { ...t, id: KANBAN_BOARD_DISTRIBUTE_ID, title: "Ответственный" };
  }
  return t;
}

/** Неизменяющее обновление: клонирует состояние и передаёт активную доску в fn. */
export function withActiveBoard(
  state: KanbanAppState,
  fn: (board: KanbanBoard) => void,
): KanbanAppState {
  const next = structuredClone(state);
  const board = next.boards.find((b) => b.id === next.activeBoardId);
  if (!board) return state;
  fn(board);
  return next;
}

export function pushActivity(
  card: KanbanCard,
  text: string,
  userId: string | undefined,
  board: KanbanBoard,
  activityActorLabel?: string,
) {
  const label = (activityActorLabel || "").trim();
  const entry: CardActivity = {
    id: generateId("act"),
    type: "update",
    text,
    userId: userId || (board.users[0] && board.users[0].id) || "",
    ...(label ? { actorLabel: label } : {}),
    at: new Date().toISOString(),
  };
  card.activity = card.activity || [];
  card.activity.unshift(entry);
  card.updatedAt = entry.at;
}

/** Сброс этапного таймера, если ответственный/участник перенёс карточку на следующую колонку. */
export function annulKanbanStageTimerOnMemberAdvance(
  card: KanbanCard,
  fromColumnIndex: number,
  toColumnIndex: number,
  sessionUserId: string | null | undefined,
  board: KanbanBoard,
  activityActorLabel?: string,
): boolean {
  if (toColumnIndex !== fromColumnIndex + 1) return false;
  const uid = (sessionUserId ?? "").trim();
  if (!uid) return false;
  const assignees = card.assignees ?? [];
  const participants = card.participants ?? [];
  if (!assignees.includes(uid) && !participants.includes(uid)) return false;
  const hadTimer =
    Boolean(card.timerStartedAt) ||
    (card.timerDurationMs != null && card.timerDurationMs > 0);
  if (!hadTimer) return false;
  card.timerStartedAt = null;
  card.timerDurationMs = null;
  card.timerFrozenAt = null;
  pushActivity(
    card,
    "Таймер аннулирован (перенос на следующий этап)",
    uid,
    board,
    activityActorLabel,
  );
  return true;
}

export function findCard(
  board: KanbanBoard,
  cardId: string,
): { col: KanbanColumn; card: KanbanCard } | null {
  for (const col of board.columns) {
    const c = col.cards.find((x) => x.id === cardId);
    if (c) return { col, card: c };
  }
  return null;
}

/** Карточка на любой доске в состоянии приложения. */
export function findCardInAppState(
  state: KanbanAppState,
  cardId: string,
): { board: KanbanBoard; col: KanbanColumn; card: KanbanCard } | null {
  for (const b of state.boards) {
    for (const col of b.columns) {
      const c = col.cards.find((x) => x.id === cardId);
      if (c) return { board: b, col, card: c };
    }
    const stopped = (b.stoppedCards || []).find((x) => x.card.id === cardId);
    if (stopped) {
      return {
        board: b,
        col: {
          id: stopped.sourceColumnId || "stop",
          title: "СТОП",
          cards: (b.stoppedCards || []).map((x) => x.card),
        },
        card: stopped.card,
      };
    }
    const archived = (b.archivedCards || []).find((x) => x.card.id === cardId);
    if (archived) {
      return {
        board: b,
        col: {
          id: archived.sourceColumnId || "archive",
          title: archived.sourceColumnTitle || "Архив",
          cards: (b.archivedCards || []).map((x) => x.card),
        },
        card: archived.card,
      };
    }
  }
  return null;
}

/**
 * При поиске — карточки из архива всех доступных досок (колонка = откуда ушли).
 * Иначе «079» не находит наряд, который уже автоархивирован из «Сдана админам».
 */
function appendArchivedSearchHits(args: {
  displayBoard: KanbanBoard;
  homes: KanbanBoard[];
  cardHomeBoardId: Map<string, string>;
  textMatches: (card: KanbanCard, home: KanbanBoard) => boolean;
  passesFilters: (card: KanbanCard, home: KanbanBoard) => boolean;
  extraKeep?: (card: KanbanCard) => boolean;
}): void {
  const seen = new Set(
    args.displayBoard.columns.flatMap((c) => c.cards.map((x) => x.id)),
  );
  for (const home of args.homes) {
    for (const row of home.archivedCards || []) {
      const card = row.card;
      if (!card || seen.has(card.id)) continue;
      if (args.extraKeep && !args.extraKeep(card)) continue;
      if (!args.textMatches(card, home)) continue;
      if (!args.passesFilters(card, home)) continue;
      const titleNorm = (row.sourceColumnTitle || "Архив").trim().toLowerCase();
      let colView = args.displayBoard.columns.find(
        (c) => c.title.trim().toLowerCase() === titleNorm,
      );
      if (!colView) {
        colView = {
          id: `search-arch-${home.id}-${titleNorm || "archive"}`,
          title: row.sourceColumnTitle?.trim() || "Архив",
          cards: [],
        };
        args.displayBoard.columns.push(colView);
      }
      seen.add(card.id);
      colView.cards.push(card);
      args.cardHomeBoardId.set(card.id, home.id);
    }
  }
}

/**
 * Вид доски для рендера: при поиске — все доступные доски (как раньше);
 * виртуальные «Мои» / «Ответственный» тоже собирают карточки со всех дорожек.
 * Карточки в данных остаются на исходной доске; `cardHomeBoardId` — для подписей и DnD-дома.
 */
export function buildKanbanDisplayView(
  state: KanbanAppState,
  opts?: { sessionUserId?: string | null; sessionUserRole?: UserRole | null },
): {
  displayBoard: KanbanBoard;
  cardHomeBoardId: Map<string, string>;
} {
  const cardHomeBoardId = new Map<string, string>();
  const q = (state.search || "").trim().toLowerCase();
  const agg = kanbanAggregateMode(state.activeBoardId);
  const sessionUserId = (opts?.sessionUserId ?? "").trim();
  const sessionUserRole = opts?.sessionUserRole ?? null;
  const accessibleBoards = state.boards.filter((b) =>
    canUserAccessBoard(b, sessionUserId || null, sessionUserRole),
  );

  const textMatches = (card: KanbanCard, home: KanbanBoard) =>
    kanbanCardMatchesSearch(card, q, home);

  const passesFiltersWithoutSearchText = (card: KanbanCard, home: KanbanBoard) => {
    const st: KanbanAppState = { ...state, search: "" };
    return cardMatchesFilters(card, home, st);
  };

  if (agg) {
    const template =
      accessibleBoards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID) ??
      accessibleBoards[0] ??
      getKanbanLayoutTemplateBoard(state);
    const displayBoard = structuredClone(template);
    displayBoard.id = state.activeBoardId;
    displayBoard.title = agg === "my" ? "Мои" : "Ответственный";
    displayBoard.automations = [];
    const uid = sessionUserId;

    for (const colView of displayBoard.columns) {
      const acc: KanbanCard[] = [];
      const seen = new Set<string>();
      const titleNorm = colView.title.trim().toLowerCase();
      for (const home of listKanbanAggregateSourceBoards(state)) {
        if (!canUserAccessBoard(home, uid || null, sessionUserRole)) continue;
        const colO = home.columns.find(
          (c) => c.title.trim().toLowerCase() === titleNorm,
        );
        if (!colO) continue;
        for (const card of colO.cards) {
          if (seen.has(card.id)) continue;
          if (!uid) continue;
          const assignees = card.assignees || [];
          const participants = card.participants || [];
          const linked = Boolean(card.linkedOrderId?.trim());
          if (agg === "my") {
            const inParts = participants.includes(uid);
            const inAssign = assignees.includes(uid);
            const ownLocal =
              !linked &&
              Boolean(card.createdByUserId?.trim()) &&
              card.createdByUserId === uid;
            if (!inParts && !inAssign && !ownLocal) continue;
          } else {
            if (!assignees.includes(uid)) continue;
          }
          if (q && !textMatches(card, home)) continue;
          if (!passesFiltersWithoutSearchText(card, home)) continue;
          seen.add(card.id);
          acc.push(card);
          cardHomeBoardId.set(card.id, home.id);
        }
      }
      colView.cards = acc;
    }
    if (q) {
      appendArchivedSearchHits({
        displayBoard,
        homes: listKanbanAggregateSourceBoards(state).filter((b) =>
          canUserAccessBoard(b, uid || null, sessionUserRole),
        ),
        cardHomeBoardId,
        textMatches,
        passesFilters: passesFiltersWithoutSearchText,
        extraKeep: (card) => {
          if (!uid) return false;
          const assignees = card.assignees || [];
          const participants = card.participants || [];
          const linked = Boolean(card.linkedOrderId?.trim());
          if (agg === "my") {
            const inParts = participants.includes(uid);
            const inAssign = assignees.includes(uid);
            const ownLocal =
              !linked &&
              Boolean(card.createdByUserId?.trim()) &&
              card.createdByUserId === uid;
            return inParts || inAssign || ownLocal;
          }
          return assignees.includes(uid);
        },
      });
      displayBoard.columns = displayBoard.columns.filter((c) => c.cards.length > 0);
    }
    return { displayBoard, cardHomeBoardId };
  }

  const active =
    state.boards.find(
      (b) =>
        b.id === state.activeBoardId &&
        canUserAccessBoard(b, sessionUserId || null, sessionUserRole),
    ) ??
    accessibleBoards[0] ??
    state.boards[0]!;

  active.columns.forEach((col) => {
    col.cards.forEach((c) => cardHomeBoardId.set(c.id, active.id));
  });

  if (!q) {
    return { displayBoard: active, cardHomeBoardId };
  }

  /* Поиск — все доступные доски, колонки как у текущей (общие этапы зеркал). */
  const displayBoard = structuredClone(active);
  const extraColumns: KanbanColumn[] = [];
  const seenColTitles = new Set(
    displayBoard.columns.map((c) => c.title.trim().toLowerCase()),
  );
  for (const home of accessibleBoards) {
    for (const col of home.columns) {
      const key = col.title.trim().toLowerCase();
      if (seenColTitles.has(key)) continue;
      seenColTitles.add(key);
      extraColumns.push(structuredClone({ ...col, cards: [] }));
    }
  }
  displayBoard.columns.push(...extraColumns);

  for (const colView of displayBoard.columns) {
    const acc: KanbanCard[] = [];
    const seen = new Set<string>();
    const titleNorm = colView.title.trim().toLowerCase();
    for (const home of accessibleBoards) {
      const colO = home.columns.find(
        (c) => c.title.trim().toLowerCase() === titleNorm,
      );
      if (!colO) continue;
      for (const card of colO.cards) {
        if (seen.has(card.id)) continue;
        if (!textMatches(card, home)) continue;
        if (!passesFiltersWithoutSearchText(card, home)) continue;
        seen.add(card.id);
        acc.push(card);
        cardHomeBoardId.set(card.id, home.id);
      }
    }
    colView.cards = acc;
  }
  appendArchivedSearchHits({
    displayBoard,
    homes: accessibleBoards,
    cardHomeBoardId,
    textMatches,
    passesFilters: passesFiltersWithoutSearchText,
  });
  displayBoard.columns = displayBoard.columns.filter((c) => c.cards.length > 0);

  return { displayBoard, cardHomeBoardId };
}

/** Сколько полей фильтра задано (для бейджа на кнопке). */
export function countActiveKanbanFilters(f: KanbanFilters): number {
  let n = 0;
  if ((f.cardTypeId || "").trim()) n += 1;
  if ((f.due || "").trim()) n += 1;
  if ((f.assigneeUserId || "").trim()) n += 1;
  if ((f.participantUserId || "").trim()) n += 1;
  return n;
}

export function cardMatchesFilters(
  card: KanbanCard,
  board: KanbanBoard,
  state: KanbanAppState,
): boolean {
  const q = (state.search || "").trim();
  if (q && !kanbanCardMatchesSearch(card, q, board)) return false;
  const ft = state.filters.cardTypeId;
  if (ft) {
    if (String(card.cardTypeId || "") !== String(ft)) return false;
  }
  const fa = state.filters.assigneeUserId;
  if (fa) {
    if (!(card.assignees || []).includes(fa)) return false;
  }
  const fp = state.filters.participantUserId;
  if (fp) {
    if (!(card.participants || []).includes(fp)) return false;
  }
  const fd = state.filters.due;
  if (fd) {
    if (fd === "urgent" && !card.urgent) return false;
    const stageDue = getKanbanStageDue(card);
    const cat = dueCategory(stageDue);
    if (fd === "none" && cat !== "none") return false;
    if (fd === "overdue" && cat !== "overdue") return false;
    if (fd === "today" && cat !== "today") return false;
    if (fd === "week") {
      if (!stageDue) return false;
      const d = new Date(stageDue + "T12:00:00");
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      if (d < start || d > end) return false;
    }
  }
  return true;
}

/** Карточка канбана, привязанная к наряду CRM. */
export function findLinkedCardOnBoard(
  board: KanbanBoard,
  orderId: string,
): { col: KanbanColumn; card: KanbanCard } | null {
  for (const col of board.columns) {
    const c = col.cards.find((x) => x.linkedOrderId === orderId);
    if (c) return { col, card: c };
  }
  return null;
}

function findLinkedOrderCardAnywhere(
  state: KanbanAppState,
  orderId: string,
): { board: KanbanBoard; col: KanbanColumn; card: KanbanCard } | null {
  for (const b of state.boards) {
    const hit = findLinkedCardOnBoard(b, orderId);
    if (hit) return { board: b, col: hit.col, card: hit.card };
  }
  return null;
}

function removeLinkedOrderCardFromBoard(board: KanbanBoard, orderId: string): void {
  for (const col of board.columns) {
    col.cards = col.cards.filter((c) => c.linkedOrderId !== orderId);
  }
}

/** Убрать linked-карточки нарядов, которых больше нет (архив / отмена / чужой тест). */
export function removeLinkedOrderCardsFromAppState(
  state: KanbanAppState,
  orderIds: string[],
): KanbanAppState {
  const gone = new Set(
    orderIds.map((id) => String(id || "").trim()).filter(Boolean),
  );
  if (gone.size === 0) return state;
  const next = structuredClone(state);
  for (const b of next.boards) {
    for (const col of b.columns) {
      col.cards = col.cards.filter(
        (c) => !c.linkedOrderId || !gone.has(c.linkedOrderId),
      );
    }
    b.archivedCards = (b.archivedCards || []).filter(
      (row) => !row.card.linkedOrderId || !gone.has(row.card.linkedOrderId),
    );
    b.stoppedCards = (b.stoppedCards || []).filter(
      (row) => !row.card.linkedOrderId || !gone.has(row.card.linkedOrderId),
    );
  }
  if (Array.isArray(next.hiddenLinkedOrderIds) && next.hiddenLinkedOrderIds.length > 0) {
    next.hiddenLinkedOrderIds = next.hiddenLinkedOrderIds.filter((id) => !gone.has(id));
  }
  return next;
}

function normalizeKaitenTrackLaneForBoard(raw: string | null | undefined): string {
  const u = String(raw || "ORTHOPEDICS")
    .trim()
    .toUpperCase();
  if (u === "ORTHODONTICS") return "ORTHODONTICS";
  return "ORTHOPEDICS";
}

function resolveBoardForKaitenLane(
  state: KanbanAppState,
  laneRaw: string | null | undefined,
): KanbanBoard | null {
  const lane = normalizeKaitenTrackLaneForBoard(laneRaw);
  const wantId =
    lane === "ORTHODONTICS"
      ? KANBAN_BOARD_ORTHODONTICS_ID
      : KANBAN_BOARD_ORTHOPEDICS_ID;
  return state.boards.find((b) => b.id === wantId) ?? state.boards[0] ?? null;
}

/**
 * Миграция legacy-формата одной доски → две («Ортопедия» / «Ортодонтия»), карточки по `trackLane`.
 */
export function migrateLegacyKanbanToDualBoards(state: KanbanAppState): void {
  if (state.boards.length !== 1) return;
  const old = state.boards[0]!;
  const ortho = createBoardShell(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия");
  ortho.users = old.users?.length ? structuredClone(old.users) : [];
  ortho.cardTypes = old.cardTypes?.length
    ? structuredClone(old.cardTypes)
    : cloneDefaultCardTypes();
  ortho.automations = Array.isArray(old.automations)
    ? structuredClone(old.automations)
    : [];
  const odon = createBoardShell(KANBAN_BOARD_ORTHODONTICS_ID, "Ортодонтия");
  odon.users = structuredClone(ortho.users);
  odon.cardTypes = structuredClone(ortho.cardTypes);
  odon.automations = structuredClone(ortho.automations);

  for (let ci = 0; ci < old.columns.length; ci++) {
    const oldCol = old.columns[ci]!;
    for (const card of [...oldCol.cards]) {
      const lane = normalizeKaitenTrackLaneForBoard(card.trackLane);
      const dest = lane === "ORTHODONTICS" ? odon : ortho;
      const destIx =
        old.columns.length <= 4
          ? Math.min([1, 2, 4, 8][ci] ?? 1, dest.columns.length - 1)
          : Math.min(ci, dest.columns.length - 1);
      dest.columns[destIx]!.cards.push(card);
    }
  }
  migrateBoard(ortho);
  migrateBoard(odon);
  state.boards = [ortho, odon];
  if (
    !state.boards.some((b) => b.id === state.activeBoardId) &&
    !isKanbanAggregateBoardId(state.activeBoardId)
  ) {
    state.activeBoardId = ortho.id;
  }
}

function shouldMigrateSingleBoardToDual(board: KanbanBoard): boolean {
  if (board.id === KANBAN_BOARD_ORTHOPEDICS_ID || board.id === KANBAN_BOARD_ORTHODONTICS_ID) {
    return false;
  }
  const hasLaneColumns = board.columns.some((col) => String(col.title || "").includes("·"));
  if (hasLaneColumns) return false;
  return true;
}

function ensureMirroredKanbanBoardsForKaiten(state: KanbanAppState): void {
  const hasOrtho = state.boards.some((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID);
  const hasOdon = state.boards.some((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID);
  if (hasOrtho && hasOdon) {
    for (const b of state.boards) normalizeBoardCardTypes(b);
    return;
  }
  if (state.boards.length === 1 && shouldMigrateSingleBoardToDual(state.boards[0]!)) {
    migrateLegacyKanbanToDualBoards(state);
    for (const b of state.boards) normalizeBoardCardTypes(b);
    return;
  }
  if (!hasOrtho) {
    const o = createBoardShell(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия");
    migrateBoard(o);
    state.boards.unshift(o);
  }
  if (!hasOdon) {
    const o = createBoardShell(KANBAN_BOARD_ORTHODONTICS_ID, "Ортодонтия");
    const ref = state.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID);
    o.cardTypes = structuredClone(ref?.cardTypes ?? cloneDefaultCardTypes());
    o.users = structuredClone(ref?.users ?? []);
    migrateBoard(o);
    state.boards.push(o);
  }
  for (const b of state.boards) normalizeBoardCardTypes(b);
}

function parseIsoToDate(iso: string | null | undefined): Date | null {
  if (!iso || !String(iso).trim()) return null;
  const d = new Date(String(iso));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Колонка доски по demoKanbanColumn наряда (NEW / IN_PROGRESS / DONE) или «К исполнению» по умолчанию. */
function resolveOrderKanbanColumn(
  board: KanbanBoard,
  demoKanbanColumn: string | null | undefined,
): KanbanColumn {
  const queue =
    board.columns.find(
      (c) => c.title.trim().toLowerCase() === "к исполнению",
    ) ?? board.columns[0];
  const raw = String(demoKanbanColumn || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  const byTitle: Record<string, string[]> = {
    NEW: [
      "бэклог",
      "backlog",
      "новые",
      "new",
      "на скан",
      "к исполнению",
      "очередь",
    ],
    IN_PROGRESS: [
      "in progress",
      "в работе",
      "производство",
      "согласование",
      "сборка",
      "обработка",
      "мануал",
      "на проверку",
    ],
    DONE: ["done", "готово", "сдана админам"],
  };
  const titles = byTitle[raw];
  if (titles) {
    const hit = board.columns.find((c) =>
      titles.some((t) => c.title.trim().toLowerCase() === t),
    );
    if (hit) return hit;
  }
  const ixByDemo: Record<string, number> = { NEW: 1, IN_PROGRESS: 4, DONE: 8 };
  const ixRaw = ixByDemo[raw];
  if (ixRaw != null) {
    const ix = Math.min(ixRaw, board.columns.length - 1);
    if (board.columns[ix]) return board.columns[ix]!;
  }
  return queue;
}

/** Боевой канбан-зеркало: колонка по `Order.kaitenColumnTitle` (как в Kaiten). */
function resolveOrderKanbanColumnFromKaitenMirrorTitle(
  board: KanbanBoard,
  kaitenColumnTitle: string | null | undefined,
): KanbanColumn {
  const queue =
    board.columns.find(
      (c) => c.title.trim().toLowerCase() === "к исполнению",
    ) ?? board.columns[0];
  const raw = String(kaitenColumnTitle || "").trim();
  if (!raw) return queue;
  const want = normalizeKanbanColumnTitle(raw);
  const exact = board.columns.find(
    (c) => normalizeKanbanColumnTitle(c.title) === want,
  );
  if (exact) return exact;
  const prefix = board.columns.find((c) => {
    const t = normalizeKanbanColumnTitle(c.title);
    return t.length > 0 && (t.startsWith(want) || want.startsWith(t));
  });
  if (prefix) return prefix;
  const loose = board.columns.find((c) => {
    const t = normalizeKanbanColumnTitle(c.title);
    return (
      t.length >= 4 &&
      want.length >= 4 &&
      (t.includes(want) || want.includes(t))
    );
  });
  return loose ?? queue;
}

function moveLinkedCardToColumn(
  card: KanbanCard,
  fromCol: KanbanColumn,
  toCol: KanbanColumn,
): void {
  if (fromCol.id === toCol.id) return;
  fromCol.cards = fromCol.cards.filter((c) => c.id !== card.id);
  toCol.cards.unshift(card);
}

function applyContinuesFromOrderToKanbanCard(
  card: KanbanCard,
  row: KaitenLinkedOrderForKanban,
): void {
  if (row.continuesFromOrder) {
    card.continuesFromOrderId = row.continuesFromOrder.id;
    card.continuesFromOrderNumber = row.continuesFromOrder.orderNumber;
  } else {
    card.continuesFromOrderId = null;
    card.continuesFromOrderNumber = null;
  }
  card.continuationFollowups = (row.continuationFollowups ?? []).map((child) => ({
    orderId: child.id,
    orderNumber: child.orderNumber,
  }));
  card.sourceEmailCount = row.sourceEmailCount ?? 0;
}

function linkedOrderKanbanDescription(
  row: KaitenLinkedOrderForKanban,
  demo: boolean,
): string {
  return resolveLinkedOrderKanbanDescription(row, demo);
}

function linkedOrderKanbanActivityCreateText(
  row: KaitenLinkedOrderForKanban,
  demo: boolean,
): string {
  if (demo) {
    return row.kaitenCardId != null
      ? "Наряд также связан с Kaiten"
      : "Карточка наряда в канбане CRM";
  }
  return row.kaitenCardId != null
    ? "Наряд опубликован в Kaiten"
    : "Карточка наряда в CRM";
}

export type MergeKaitenLinkedOrdersOptions = {
  /** В демо: тип карточки по первой позиции прайса; дорожка = доска «Работы». */
  demo?: boolean;
  /**
   * `replaceEligible` (default) — убрать linked-карточки, которых нет в `rows`
   * (осторожно с частичной выборкой).
   * `upsertOnly` — только добавить/обновить строки из `rows`, чужие linked не трогать.
   */
  mode?: "replaceEligible" | "upsertOnly";
};

/** Карточки нарядов вверху колонки, по `kaitenCardSortOrder` как в Kaiten; прочие карточки — ниже. */
function sortMirrorLinkedCardsInBoard(board: KanbanBoard): void {
  for (const col of board.columns) {
    const linked: KanbanCard[] = [];
    const nonLinked: KanbanCard[] = [];
    for (const c of col.cards) {
      if (c.linkedOrderId) linked.push(c);
      else nonLinked.push(c);
    }
    const orderIndex = new Map<string, number>();
    linked.forEach((c, i) => orderIndex.set(c.id, i));
    linked.sort((a, b) => {
      const aK =
        a.kaitenCardId != null && Number.isFinite(a.kaitenCardId);
      const bK =
        b.kaitenCardId != null && Number.isFinite(b.kaitenCardId);
      if (!aK || !bK) {
        return (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0);
      }
      const sa = a.kaitenCardSortOrder;
      const sb = b.kaitenCardSortOrder;
      const aBad = sa == null || !Number.isFinite(sa);
      const bBad = sb == null || !Number.isFinite(sb);
      if (aBad && bBad) {
        return (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0);
      }
      if (aBad) return 1;
      if (bBad) return -1;
      if (sa !== sb) return (sa as number) - (sb as number);
      return (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0);
    });
    col.cards = [...linked, ...nonLinked];
  }
}

/** Вложения наряда в `card.files` канбана (превью по URL GET с cookie). */
export function cardFilesFromOrderAttachments(
  orderId: string,
  attachments: NonNullable<KaitenLinkedOrderForKanban["attachments"]>,
): CardFile[] {
  return attachments.map((a) => ({
    id: `oa-${a.id}`,
    name: a.fileName,
    mime: a.mimeType || "application/octet-stream",
    size: a.size,
    dataUrl: `/api/orders/${orderId}/attachments/${a.id}`,
    addedAt: a.createdAt,
    addedByUserId: "",
    orderAttachmentId: a.id,
  }));
}

/** Согласовано с `isCardFileImage` в card-files (без импорта — там цикл с model). */
function cardFileLooksLikeImageForChat(f: { mime: string; name: string }): boolean {
  const m = (f.mime || "").toLowerCase();
  if (m.startsWith("image/")) return true;
  const n = (f.name || "").toLowerCase();
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(n);
}

/**
 * Для каждого файла-картинки в карточке добавляет «пустое» сообщение с imageFileId,
 * чтобы чат канбана показывал превью (в т.ч. вложения наряда после merge).
 */
function syncChatImageCommentsWithImageFiles(card: KanbanCard): void {
  const files = card.files || [];
  const fileIds = new Set(files.map((f) => f.id));
  const nextComments = (card.comments || []).filter(
    (c) => !c.imageFileId || fileIds.has(c.imageFileId),
  );
  const seen = new Set(
    nextComments.map((c) => c.imageFileId).filter(Boolean) as string[],
  );
  for (const f of files) {
    if (!cardFileLooksLikeImageForChat(f)) continue;
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    nextComments.push({
      id: generateId("cm"),
      userId: "",
      text: "",
      createdAt: f.addedAt || new Date().toISOString(),
      imageFileId: f.id,
      parentId: null,
      externalCommentId: null,
      externalParentId: null,
      source: "CRM",
      syncStatus: "local",
      syncedAt: null,
    });
  }
  card.comments = nextComments;
}

/**
 * Сливает вложения наряда в card.files.
 * Не схлопывает по имени: несколько «image.png» — разные id.
 */
export function mergeOrderAttachmentsIntoLinkedCard(
  card: KanbanCard,
  orderId: string,
  row: KaitenLinkedOrderForKanban,
): void {
  const list = row.attachments;
  if (list === undefined) return;
  const existingOrderFiles = (card.files || []).filter((f) => Boolean(f.orderAttachmentId));
  if (list.length === 0 && existingOrderFiles.length > 0) {
    syncChatImageCommentsWithImageFiles(card);
    return;
  }
  const fromOrder = cardFilesFromOrderAttachments(orderId, list);
  const incomingIds = new Set(list.map((a) => a.id));
  const existingOaIds = new Set(
    existingOrderFiles
      .map((f) => f.orderAttachmentId)
      .filter((id): id is string => Boolean(id)),
  );
  const incomingIsPartialSubset =
    list.length > 0 &&
    existingOrderFiles.length > list.length &&
    [...incomingIds].every((id) => existingOaIds.has(id));
  const orderFiles = incomingIsPartialSubset
    ? existingOrderFiles.map((f) => {
        const fresh = fromOrder.find((x) => x.orderAttachmentId === f.orderAttachmentId);
        return fresh ?? f;
      })
    : fromOrder;
  const orderIdSet = new Set(
    orderFiles
      .map((f) => f.orderAttachmentId)
      .filter((id): id is string => Boolean(id)),
  );
  const kanbanOnly = (card.files || []).filter((f) => {
    if (f.orderAttachmentId) return false;
    if (f.id.startsWith("oa-") && orderIdSet.has(f.id.slice(3))) return false;
    const isData = (f.dataUrl || "").startsWith("data:");
    if (isData && cardFileLooksLikeImageForChat(f)) {
      const leftoverUpload = orderFiles.some(
        (o) =>
          (o.name || "").trim().toLowerCase() === (f.name || "").trim().toLowerCase() &&
          o.size === f.size,
      );
      if (leftoverUpload) return false;
    }
    return true;
  });
  card.files = [...orderFiles, ...kanbanOnly];
  syncChatImageCommentsWithImageFiles(card);
}

function resolveLinkedOrderCardTypeId(
  board: KanbanBoard,
  row: KaitenLinkedOrderForKanban,
  demo: boolean,
): string {
  if (demo && row.primaryPriceListItemName?.trim()) {
    const needle = row.primaryPriceListItemName.trim().toLowerCase();
    const hit = (board.cardTypes || []).find(
      (t) => t.name.trim().toLowerCase() === needle,
    );
    if (hit?.id) return hit.id;
  }
  if (row.kaitenCardTypeName?.trim()) {
    const needle = row.kaitenCardTypeName.trim().toLowerCase();
    const hit = (board.cardTypes || []).find(
      (t) => t.name.trim().toLowerCase() === needle,
    );
    if (hit?.id) return hit.id;
  }
  if (
    row.kaitenCardTypeId &&
    (board.cardTypes || []).some((t) => t.id === row.kaitenCardTypeId)
  ) {
    return row.kaitenCardTypeId;
  }
  return "";
}

function linkedOrderKanbanBlockedAtIso(
  row: KaitenLinkedOrderForKanban,
  fallbackIso: string,
): string {
  if (!row.kaitenBlocked) return "";
  if (row.kaitenBlockedAt) {
    const d = new Date(row.kaitenBlockedAt);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return fallbackIso;
}

/**
 * Подмешивает карточки нарядов на канбан.
 * Демо — только активная доска «Работы».
 * Боевой режим — две доски «Ортопедия» / «Ортодонтия» по `kaitenTrackLane` наряда.
 */
export function mergeKaitenLinkedOrdersIntoAppState(
  state: KanbanAppState,
  rows: KaitenLinkedOrderForKanban[],
  opts?: MergeKaitenLinkedOrdersOptions,
): KanbanAppState {
  const next = structuredClone(state);
  const hidden = new Set(next.hiddenLinkedOrderIds || []);
  const visibleRows = rows.filter((r) => !hidden.has(r.id));
  const orderIds = new Set(visibleRows.map((r) => r.id));
  const demo = Boolean(opts?.demo);
  const upsertOnly = opts?.mode === "upsertOnly";

  if (demo) {
    const activeBoard =
      next.boards.find((b) => b.id === next.activeBoardId) ??
      getKanbanLayoutTemplateBoard(next);
    if (!activeBoard || !activeBoard.columns.length) return next;
    if (!upsertOnly) {
      for (const col of activeBoard.columns) {
        col.cards = col.cards.filter(
          (c) => !c.linkedOrderId || orderIds.has(c.linkedOrderId),
        );
      }
    }
    normalizeBoardCardTypes(activeBoard);
    for (const row of visibleRows) {
      if (isLinkedOrderArchivedOnBoard(activeBoard, row.id)) continue;
      const cardDbId = `kaiten-order-${row.id}`;
      const dueDateAt = parseIsoToDate(row.dueDate);
      const title = buildKaitenCardTitle({
        orderNumber: row.orderNumber,
        patientName: row.patientName,
        doctor: { fullName: row.doctorFullName || "—" },
        dueDate: dueDateAt,
        kaitenLabDueHasTime: row.kaitenAdminDueHasTime !== false,
        kaitenCardTitleLabel: row.kaitenCardTitleLabel,
        kaitenCardType: row.kaitenCardTypeName
          ? { name: row.kaitenCardTypeName }
          : null,
        isUrgent: row.isUrgent,
        urgentCoefficient: row.urgentCoefficient,
      });
      const desc = linkedOrderKanbanDescription(row, true);
      const effType = resolveLinkedOrderCardTypeId(activeBoard, row, true);
      const fallbackTypeId = effType || (activeBoard.cardTypes?.[0]?.id ?? "");
      const targetCol = resolveOrderKanbanColumn(
        activeBoard,
        row.demoKanbanColumn,
      );
      const found = findLinkedCardOnBoard(activeBoard, row.id);
      const nowIso = new Date().toISOString();
      if (found) {
        const hasKaiten =
          row.kaitenCardId != null && Number.isFinite(row.kaitenCardId);
        if (hasKaiten && found.col.id !== targetCol.id) {
          moveLinkedCardToColumn(found.card, found.col, targetCol);
        }
        found.card.title = title;
        found.card.description = desc;
        applyContinuesFromOrderToKanbanCard(found.card, row);
        found.card.kaitenCardId = row.kaitenCardId ?? null;
        found.card.linkedOrderId = row.id;
        found.card.linkedOrderNumber = row.orderNumber;
        found.card.cardTypeId = fallbackTypeId;
        found.card.trackLane = DEMO_KANBAN_TRACK_LANE_ID;
        found.card.blocked = !!row.kaitenBlocked;
        found.card.blockReason = (row.kaitenBlockReason || "").trim();
        found.card.kaitenCardSortOrder = row.kaitenCardSortOrder ?? null;
        found.card.blockedAt = linkedOrderKanbanBlockedAtIso(row, nowIso);
        if (!found.card.blocked) {
          found.card.blockedByUserId = "";
        }
        found.card.updatedAt = nowIso;
        mergeOrderAttachmentsIntoLinkedCard(found.card, row.id, row);
      } else {
        const card = createCard({
          id: cardDbId,
          title,
          description: desc,
          cardTypeId: fallbackTypeId,
          dueDate: "",
          urgent: false,
          linkedOrderId: row.id,
          linkedOrderNumber: row.orderNumber,
          kaitenCardId: row.kaitenCardId ?? null,
          kaitenCardSortOrder: row.kaitenCardSortOrder ?? null,
          trackLane: DEMO_KANBAN_TRACK_LANE_ID,
          blocked: !!row.kaitenBlocked,
          blockReason: (row.kaitenBlockReason || "").trim(),
          blockedAt: linkedOrderKanbanBlockedAtIso(row, nowIso),
          blockedByUserId: "",
          activity: [
            {
              id: generateId("act"),
              type: "create",
              text: linkedOrderKanbanActivityCreateText(row, true),
              userId: "",
              at: nowIso,
            },
        ],
      });
        applyContinuesFromOrderToKanbanCard(card, row);
        mergeOrderAttachmentsIntoLinkedCard(card, row.id, row);
        targetCol.cards.unshift(card);
      }
    }
    sortMirrorLinkedCardsInBoard(activeBoard);
    return next;
  }

  ensureMirroredKanbanBoardsForKaiten(next);
  if (!upsertOnly) {
    for (const b of next.boards) {
      for (const col of b.columns) {
        col.cards = col.cards.filter(
          (c) => !c.linkedOrderId || orderIds.has(c.linkedOrderId),
        );
      }
    }
  }

  for (const row of visibleRows) {
    const targetBoard = resolveBoardForKaitenLane(next, row.kaitenTrackLane);
    if (!targetBoard || !targetBoard.columns.length) continue;
    if (isLinkedOrderArchivedOnBoard(targetBoard, row.id)) continue;
    const reuseFromOtherBoard = findLinkedOrderCardAnywhere(next, row.id);
    const reuseCard = reuseFromOtherBoard?.card ?? null;
    for (const b of next.boards) {
      if (b.id !== targetBoard.id) {
        removeLinkedOrderCardFromBoard(b, row.id);
      }
    }
    normalizeBoardCardTypes(targetBoard);

    const cardDbId = `kaiten-order-${row.id}`;
    const dueDateAt = parseIsoToDate(row.dueDate);
    const titleFromOrder = buildKaitenCardTitle({
      orderNumber: row.orderNumber,
      patientName: row.patientName,
      doctor: { fullName: row.doctorFullName || "—" },
      dueDate: dueDateAt,
      kaitenLabDueHasTime: row.kaitenAdminDueHasTime !== false,
      kaitenCardTitleLabel: row.kaitenCardTitleLabel,
      kaitenCardType: row.kaitenCardTypeName
        ? { name: row.kaitenCardTypeName }
        : null,
      isUrgent: row.isUrgent,
      urgentCoefficient: row.urgentCoefficient,
    });
    const title = resolveLinkedOrderKanbanTitle(row, titleFromOrder);
    const desc = linkedOrderKanbanDescription(row, false);
    const effType = resolveLinkedOrderCardTypeId(targetBoard, row, false);
    const fallbackTypeId = effType || (targetBoard.cardTypes?.[0]?.id ?? "");
    const lane = normalizeKaitenTrackLaneForBoard(row.kaitenTrackLane);

    const targetCol = resolveOrderKanbanColumnFromKaitenMirrorTitle(
      targetBoard,
      row.kaitenColumnTitle,
    );
    const found = findLinkedCardOnBoard(targetBoard, row.id);
    let foundEff = found;
    if (!foundEff && reuseCard && reuseCard.linkedOrderId === row.id) {
      targetCol.cards.unshift(reuseCard);
      foundEff = findLinkedCardOnBoard(targetBoard, row.id);
    }
    const nowIso = new Date().toISOString();
    if (foundEff) {
      const hasKaiten =
        row.kaitenCardId != null && Number.isFinite(row.kaitenCardId);
      if (hasKaiten && foundEff.col.id !== targetCol.id) {
        pushActivity(
          foundEff.card,
          `Перемещена в «${targetCol.title}» (Kaiten)`,
          targetBoard.users[0]?.id,
          targetBoard,
        );
        moveLinkedCardToColumn(foundEff.card, foundEff.col, targetCol);
      }
      foundEff.card.title = title;
      foundEff.card.description = desc;
      applyContinuesFromOrderToKanbanCard(foundEff.card, row);
      foundEff.card.kaitenCardId = row.kaitenCardId ?? null;
      foundEff.card.linkedOrderId = row.id;
      foundEff.card.linkedOrderNumber = row.orderNumber;
      foundEff.card.cardTypeId = fallbackTypeId;
      foundEff.card.trackLane = lane;
      foundEff.card.blocked = !!row.kaitenBlocked;
      foundEff.card.blockReason = (row.kaitenBlockReason || "").trim();
      foundEff.card.kaitenCardSortOrder = row.kaitenCardSortOrder ?? null;
      foundEff.card.blockedAt = linkedOrderKanbanBlockedAtIso(row, nowIso);
      if (!foundEff.card.blocked) {
        foundEff.card.blockedByUserId = "";
      }
      foundEff.card.updatedAt = nowIso;
      mergeOrderAttachmentsIntoLinkedCard(foundEff.card, row.id, row);
    } else {
      const card = createCard({
        id: cardDbId,
        title,
        description: desc,
        cardTypeId: fallbackTypeId,
        dueDate: "",
        urgent: false,
        linkedOrderId: row.id,
        linkedOrderNumber: row.orderNumber,
        kaitenCardId: row.kaitenCardId ?? null,
        kaitenCardSortOrder: row.kaitenCardSortOrder ?? null,
        trackLane: lane,
        blocked: !!row.kaitenBlocked,
        blockReason: (row.kaitenBlockReason || "").trim(),
        blockedAt: linkedOrderKanbanBlockedAtIso(row, nowIso),
        blockedByUserId: "",
        activity: [
          {
            id: generateId("act"),
            type: "create",
            text: linkedOrderKanbanActivityCreateText(row, false),
            userId: "",
            at: nowIso,
          },
        ],
      });
      applyContinuesFromOrderToKanbanCard(card, row);
      mergeOrderAttachmentsIntoLinkedCard(card, row.id, row);
      targetCol.cards.unshift(card);
    }
  }
  for (const b of next.boards) {
    sortMirrorLinkedCardsInBoard(b);
  }
  return next;
}

export function userNameById(board: KanbanBoard, userId: string): string {
  const u = board.users.find((x) => x.id === userId);
  return u ? u.name : "Неизвестно";
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
