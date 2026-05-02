import type {
  CardActivity,
  CardFile,
  KanbanAppState,
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
  KanbanFilters,
  CardTypeDef,
} from "./types";
import { buildKaitenCardTitle } from "@/lib/kaiten-card-title";
import { normalizeKanbanColumnTitle } from "@/lib/kaiten-column-title";
import type { KaitenLinkedOrderForKanban } from "@/lib/kanban/kaiten-linked-order";

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

/**
 * Виртуальные доски: только представление, карточки остаются на дорожках «Ортопедия» / «Ортодонтия».
 * «Мои» — карточки, где пользователь в **участниках** (`participants`); «Распределить» — где он **ответственный** (`assignees`).
 */
export const KANBAN_BOARD_MY_CARDS_ID = "kanban_board_my_cards";
export const KANBAN_BOARD_DISTRIBUTE_ID = "kanban_board_distribute";

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
): boolean {
  if (board.isPrivate !== true) return true;
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

/** Откуда собирать карточки на «Мои» / «Распределить» (зеркала Kaiten или одна демо-доска). */
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
  const palette = ["#5b8cff", "#ff55dd", "#40f090", "#00d4ff", "#ffb020"];
  const names = [
    "Диагностика и план",
    "Временная коронка",
    "Коронка МК",
    "Коронка Zr",
    "Съёмный протез",
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
  return [
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
  for (const bid of mirrorIds) {
    const b = next.boards.find((x) => x.id === bid);
    if (!b) continue;
    const oldTypes = b.cardTypes ? [...b.cardTypes] : [];
    b.cardTypes = newTypes.map((t) => ({ ...t }));
    for (const col of b.columns) {
      for (const c of col.cards) {
        if (!c.cardTypeId) continue;
        if (newIds.has(c.cardTypeId)) continue;
        const oldT = oldTypes.find((t) => t.id === c.cardTypeId);
        const nameKey = (oldT?.name || "").trim().toLowerCase();
        const hit = nameKey
          ? newTypes.find((t) => t.name.trim().toLowerCase() === nameKey)
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

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
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
          ...(partial.kaitenCardSortOrder !== undefined
            ? { kaitenCardSortOrder: partial.kaitenCardSortOrder }
            : {}),
        }
      : {}),
    cardTypeId: partial.cardTypeId != null ? partial.cardTypeId : "",
    assignees: partial.assignees || [],
    participants: partial.participants || [],
    dueDate: partial.dueDate || "",
    urgent: !!partial.urgent,
    checklist: partial.checklist || [],
    files: Array.isArray(partial.files) ? partial.files : [],
    comments: partial.comments || [],
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
  };
}

export function migrateBoard(board: KanbanBoard): KanbanBoard {
  if (!board || !board.columns) return board;
  if (typeof board.isPrivate !== "boolean") board.isPrivate = false;
  if (!Array.isArray(board.accessUserIds)) board.accessUserIds = [];
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
      (c.files || []).forEach((f) => {
        if (!f.addedAt) f.addedAt = c.updatedAt || new Date().toISOString();
        if (!f.addedByUserId && board.users && board.users[0])
          f.addedByUserId = board.users[0].id;
      });
    });
  });
  stripLegacyDemoUsers(board);
  if (!Array.isArray(board.automations)) {
    board.automations = [];
  }
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
    isPrivate: false,
    accessUserIds: [],
    columns,
    users,
    cardTypes,
    automations: [],
  };
}

export function createInitialBoard(): KanbanBoard {
  return createBoardShell(generateId("board"), "Рабочая доска");
}

export function defaultAppState(): KanbanAppState {
  const ortho = createBoardShell(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия");
  const odon = createBoardShell(KANBAN_BOARD_ORTHODONTICS_ID, "Ортодонтия");
  const now = new Date();
  return {
    version: 2,
    boards: [ortho, odon],
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
    return { ...t, id: KANBAN_BOARD_DISTRIBUTE_ID, title: "Распределить" };
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
  }
  return null;
}

/**
 * Вид доски для рендера: поиск по всем дорожкам, виртуальные «Мои» / «Распределить».
 * «Мои»: участник ИЛИ ответственный ИЛИ наряд CRM без участников/ответственных (общая очередь),
 * либо локальная карточка без наряда, созданная текущим пользователем.
 * «Распределить»: ответственный текущего пользователя ИЛИ наряд без ответственных (очередь раздачи).
 * Карточки без `linkedOrderId` живут только в localStorage автора — другие пользователи их не увидят.
 * Карточки в данных остаются на исходной доске; `cardHomeBoardId` — для подписей и DnD-дома.
 */
export function buildKanbanDisplayView(
  state: KanbanAppState,
  opts?: { sessionUserId?: string | null },
): {
  displayBoard: KanbanBoard;
  cardHomeBoardId: Map<string, string>;
} {
  const cardHomeBoardId = new Map<string, string>();
  const q = (state.search || "").trim().toLowerCase();
  const agg = kanbanAggregateMode(state.activeBoardId);
  const sessionUserId = (opts?.sessionUserId ?? "").trim();
  const accessibleBoards = state.boards.filter((b) =>
    canUserAccessBoard(b, sessionUserId || null),
  );

  const textMatches = (card: KanbanCard) => {
    const inTitle = (card.title || "").toLowerCase().includes(q);
    const inDesc = (card.description || "").toLowerCase().includes(q);
    return inTitle || inDesc;
  };

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
    displayBoard.title = agg === "my" ? "Мои" : "Распределить";
    displayBoard.automations = [];
    const uid = sessionUserId;

    for (const colView of displayBoard.columns) {
      const acc: KanbanCard[] = [];
      const seen = new Set<string>();
      const titleNorm = colView.title.trim().toLowerCase();
      for (const home of listKanbanAggregateSourceBoards(state)) {
        if (!canUserAccessBoard(home, uid || null)) continue;
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
            const teamLinkedQueue =
              linked && participants.length === 0 && assignees.length === 0;
            const ownLocal =
              !linked &&
              Boolean(card.createdByUserId?.trim()) &&
              card.createdByUserId === uid;
            if (!inParts && !inAssign && !teamLinkedQueue && !ownLocal) continue;
          } else {
            const unassignedLinked = linked && assignees.length === 0;
            if (!assignees.includes(uid) && !unassignedLinked) continue;
          }
          if (q && !textMatches(card)) continue;
          if (!passesFiltersWithoutSearchText(card, home)) continue;
          seen.add(card.id);
          acc.push(card);
          cardHomeBoardId.set(card.id, home.id);
        }
      }
      colView.cards = acc;
    }
    return { displayBoard, cardHomeBoardId };
  }

  const active =
    state.boards.find(
      (b) => b.id === state.activeBoardId && canUserAccessBoard(b, sessionUserId || null),
    ) ??
    accessibleBoards[0] ??
    state.boards[0]!;

  active.columns.forEach((col) => {
    col.cards.forEach((c) => cardHomeBoardId.set(c.id, active.id));
  });

  if (!q) {
    return { displayBoard: active, cardHomeBoardId };
  }

  const displayBoard = structuredClone(active);

  for (const colView of displayBoard.columns) {
    const acc: KanbanCard[] = [];
    const seen = new Set<string>();
    const add = (card: KanbanCard, home: KanbanBoard) => {
      if (seen.has(card.id)) return;
      if (!textMatches(card) || !passesFiltersWithoutSearchText(card, home)) return;
      seen.add(card.id);
      acc.push(card);
      cardHomeBoardId.set(card.id, home.id);
    };

    const colActive = active.columns.find((c) => c.id === colView.id);
    if (colActive) colActive.cards.forEach((c) => add(c, active));

    const titleNorm = colView.title.trim().toLowerCase();
    for (const ob of state.boards) {
      if (ob.id === active.id) continue;
      if (!canUserAccessBoard(ob, sessionUserId || null)) continue;
      const colO = ob.columns.find(
        (c) => c.title.trim().toLowerCase() === titleNorm,
      );
      if (!colO) continue;
      colO.cards.forEach((c) => add(c, ob));
    }

    colView.cards = acc;
  }

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
  const q = (state.search || "").trim().toLowerCase();
  if (q) {
    const inTitle = (card.title || "").toLowerCase().includes(q);
    const inDesc = (card.description || "").toLowerCase().includes(q);
    if (!inTitle && !inDesc) return false;
  }
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
    const cat = dueCategory(card.dueDate);
    if (fd === "none" && cat !== "none") return false;
    if (fd === "overdue" && cat !== "overdue") return false;
    if (fd === "today" && cat !== "today") return false;
    if (fd === "week") {
      if (!card.dueDate) return false;
      const d = new Date(card.dueDate + "T12:00:00");
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

function removeLinkedOrderCardFromBoard(board: KanbanBoard, orderId: string): void {
  for (const col of board.columns) {
    col.cards = col.cards.filter((c) => c.linkedOrderId !== orderId);
  }
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
 * Одна доска в localStorage → две («Ортопедия» / «Ортодонтия»), карточки по `trackLane`.
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

function ensureMirroredKanbanBoardsForKaiten(state: KanbanAppState): void {
  const hasOrtho = state.boards.some((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID);
  const hasOdon = state.boards.some((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID);
  if (hasOrtho && hasOdon) {
    for (const b of state.boards) normalizeBoardCardTypes(b);
    return;
  }
  if (state.boards.length === 1) {
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

function linkedOrderKanbanDescription(
  row: KaitenLinkedOrderForKanban,
  demo: boolean,
): string {
  const blocks: string[] = [];
  const client = row.clientOrderText?.trim();
  const notes = row.notes?.trim();
  if (client) blocks.push(`Заказ от клиента:\n${client}`);
  if (notes) blocks.push(`Комментарий:\n${notes}`);
  const tail = demo
    ? row.kaitenCardId != null
      ? `Также в Kaiten: #${row.kaitenCardId}`
      : "Карточка канбана в CRM"
    : row.kaitenCardId != null
      ? `Наряд в CRM. Карточка Kaiten: #${row.kaitenCardId}`
      : "Наряд в CRM. Карточка Kaiten ещё не создана.";
  blocks.push(tail);
  return blocks.join("\n\n");
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
    });
  }
  card.comments = nextComments;
}

function mergeOrderAttachmentsIntoLinkedCard(
  card: KanbanCard,
  orderId: string,
  row: KaitenLinkedOrderForKanban,
): void {
  const list = row.attachments;
  if (list === undefined) return;
  // На пустом list API иногда отдаёт промежуточный снимок:
  // если уже были order-attachment файлы, не сбрасываем их до следующего непустого ответа.
  const existingOrderFiles = (card.files || []).filter((f) => Boolean(f.orderAttachmentId));
  if (list.length === 0 && existingOrderFiles.length > 0) {
    syncChatImageCommentsWithImageFiles(card);
    return;
  }
  const fromOrder = cardFilesFromOrderAttachments(orderId, list);
  const orderIds = new Set(list.map((a) => a.id));
  const kanbanOnly = (card.files || []).filter(
    (f) => !f.orderAttachmentId || !orderIds.has(f.orderAttachmentId),
  );
  card.files = [...fromOrder, ...kanbanOnly];
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

  if (demo) {
    const activeBoard =
      next.boards.find((b) => b.id === next.activeBoardId) ??
      getKanbanLayoutTemplateBoard(next);
    if (!activeBoard || !activeBoard.columns.length) return next;
    for (const col of activeBoard.columns) {
      col.cards = col.cards.filter(
        (c) => !c.linkedOrderId || orderIds.has(c.linkedOrderId),
      );
    }
    normalizeBoardCardTypes(activeBoard);
    for (const row of visibleRows) {
      const cardDbId = `kaiten-order-${row.id}`;
      const dueDateAt = parseIsoToDate(row.dueDate);
      const title = buildKaitenCardTitle({
        orderNumber: row.orderNumber,
        patientName: row.patientName,
        doctor: { fullName: row.doctorFullName || "—" },
        dueDate: dueDateAt,
        kaitenLabDueHasTime: true,
        kaitenCardTitleLabel: row.kaitenCardTitleLabel,
        kaitenCardType: row.kaitenCardTypeName
          ? { name: row.kaitenCardTypeName }
          : null,
        isUrgent: row.isUrgent,
        urgentCoefficient: row.urgentCoefficient,
      });
      const dueStr = row.dueDate ? String(row.dueDate).slice(0, 10) : "";
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
        found.card.kaitenCardId = row.kaitenCardId ?? null;
        found.card.linkedOrderId = row.id;
        found.card.dueDate = dueStr;
        found.card.urgent = row.isUrgent;
        found.card.cardTypeId = fallbackTypeId;
        found.card.trackLane = DEMO_KANBAN_TRACK_LANE_ID;
        found.card.blocked = !!row.kaitenBlocked;
        found.card.blockReason = (row.kaitenBlockReason || "").trim();
        found.card.kaitenCardSortOrder = row.kaitenCardSortOrder ?? null;
        if (found.card.blocked && !found.card.blockedAt) {
          found.card.blockedAt = nowIso;
        }
        if (!found.card.blocked) {
          found.card.blockedAt = "";
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
          dueDate: dueStr,
          urgent: row.isUrgent,
          linkedOrderId: row.id,
          kaitenCardId: row.kaitenCardId ?? null,
          kaitenCardSortOrder: row.kaitenCardSortOrder ?? null,
          trackLane: DEMO_KANBAN_TRACK_LANE_ID,
          blocked: !!row.kaitenBlocked,
          blockReason: (row.kaitenBlockReason || "").trim(),
          blockedAt: row.kaitenBlocked ? nowIso : "",
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
        mergeOrderAttachmentsIntoLinkedCard(card, row.id, row);
        targetCol.cards.unshift(card);
      }
    }
    sortMirrorLinkedCardsInBoard(activeBoard);
    return next;
  }

  ensureMirroredKanbanBoardsForKaiten(next);
  for (const b of next.boards) {
    for (const col of b.columns) {
      col.cards = col.cards.filter(
        (c) => !c.linkedOrderId || orderIds.has(c.linkedOrderId),
      );
    }
  }

  for (const row of visibleRows) {
    const targetBoard = resolveBoardForKaitenLane(next, row.kaitenTrackLane);
    if (!targetBoard || !targetBoard.columns.length) continue;
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
      kaitenLabDueHasTime: true,
      kaitenCardTitleLabel: row.kaitenCardTitleLabel,
      kaitenCardType: row.kaitenCardTypeName
        ? { name: row.kaitenCardTypeName }
        : null,
      isUrgent: row.isUrgent,
      urgentCoefficient: row.urgentCoefficient,
    });
    const title =
      row.kaitenCardTitleMirror != null &&
      String(row.kaitenCardTitleMirror).trim() !== ""
        ? String(row.kaitenCardTitleMirror).trim()
        : titleFromOrder;
    const dueStr = row.dueDate ? String(row.dueDate).slice(0, 10) : "";
    const descFromOrder = linkedOrderKanbanDescription(row, false);
    const desc =
      row.kaitenCardDescriptionMirror != null
        ? String(row.kaitenCardDescriptionMirror)
        : descFromOrder;
    const effType = resolveLinkedOrderCardTypeId(targetBoard, row, false);
    const fallbackTypeId = effType || (targetBoard.cardTypes?.[0]?.id ?? "");
    const lane = normalizeKaitenTrackLaneForBoard(row.kaitenTrackLane);

    const targetCol = resolveOrderKanbanColumnFromKaitenMirrorTitle(
      targetBoard,
      row.kaitenColumnTitle,
    );
    const found = findLinkedCardOnBoard(targetBoard, row.id);
    const nowIso = new Date().toISOString();
    if (found) {
      const hasKaiten =
        row.kaitenCardId != null && Number.isFinite(row.kaitenCardId);
      if (hasKaiten && found.col.id !== targetCol.id) {
        moveLinkedCardToColumn(found.card, found.col, targetCol);
      }
      found.card.title = title;
      found.card.description = desc;
      found.card.kaitenCardId = row.kaitenCardId ?? null;
      found.card.linkedOrderId = row.id;
      found.card.dueDate = dueStr;
      found.card.urgent = row.isUrgent;
      found.card.cardTypeId = fallbackTypeId;
      found.card.trackLane = lane;
      found.card.blocked = !!row.kaitenBlocked;
      found.card.blockReason = (row.kaitenBlockReason || "").trim();
      found.card.kaitenCardSortOrder = row.kaitenCardSortOrder ?? null;
      if (found.card.blocked && !found.card.blockedAt) {
        found.card.blockedAt = nowIso;
      }
      if (!found.card.blocked) {
        found.card.blockedAt = "";
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
        dueDate: dueStr,
        urgent: row.isUrgent,
        linkedOrderId: row.id,
        kaitenCardId: row.kaitenCardId ?? null,
        kaitenCardSortOrder: row.kaitenCardSortOrder ?? null,
        trackLane: lane,
        blocked: !!row.kaitenBlocked,
        blockReason: (row.kaitenBlockReason || "").trim(),
        blockedAt: row.kaitenBlocked ? nowIso : "",
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
