/**
 * Компактный localStorage: люди и срок этапа по наряду.
 * Переживает F5, пока tenant JSON ещё не пришёл или его затёрли пустым PUT.
 */
import {
  forEachKanbanCardInState,
  getKanbanStageDue,
  setKanbanStageDue,
} from "@/lib/kanban/kanban-stage-due";
import {
  hasKanbanCardMembers,
  shouldKeepLocalKanbanMembers,
  shouldKeepLocalKanbanStageDue,
} from "@/lib/kanban/preserve-kanban-card-head";
import type { ChecklistItem, KanbanAppState, KanbanCard } from "@/lib/kanban/types";

export const KANBAN_CARD_HEADS_CACHE_KEY = "kanban-card-heads-v1";

export type KanbanCardHeadCacheRow = {
  assignees: string[];
  participants: string[];
  fingerprint: string | null;
  stageDue: string;
  timerStartedAt?: string | null;
  timerDurationMs?: number | null;
  timerFrozenAt?: string | null;
  checklist?: ChecklistItem[];
  /** Колонка CRM после переноса — F5 не откатывает, пока плитка/Kaiten догоняют. */
  columnTitle?: string;
};

function slimChecklist(items: readonly ChecklistItem[] | undefined): ChecklistItem[] {
  return (items || []).slice(0, 60).map((row) => ({
    id: String(row.id || ""),
    text: String(row.text || "").slice(0, 400),
    completed: Boolean(row.completed),
    completedAt: row.completedAt ?? null,
    assigneeId: row.assigneeId ?? null,
  }));
}

function headHasTimer(row: Pick<KanbanCardHeadCacheRow, "timerStartedAt" | "timerDurationMs">): boolean {
  return (
    Boolean(row.timerStartedAt) ||
    (row.timerDurationMs != null && row.timerDurationMs > 0)
  );
}

export type KanbanCardHeadsCache = Record<string, KanbanCardHeadCacheRow>;

function cacheKeyForCard(card: Pick<KanbanCard, "id" | "linkedOrderId">): string | null {
  const oid = String(card.linkedOrderId || "").trim();
  if (oid) return `oid:${oid}`;
  const id = String(card.id || "").trim();
  return id ? `id:${id}` : null;
}

export function collectKanbanCardHeadsCache(
  state: KanbanAppState,
): KanbanCardHeadsCache {
  const out: KanbanCardHeadsCache = {};
  for (const board of state.boards ?? []) {
    for (const col of board.columns ?? []) {
      for (const card of col.cards ?? []) {
        const key = cacheKeyForCard(card);
        if (!key) continue;
        const stageDue = getKanbanStageDue(card);
        const checklist = slimChecklist(card.checklist);
        const columnTitle = (col.title || "").trim();
        if (
          !hasKanbanCardMembers(card) &&
          !stageDue &&
          !headHasTimer(card) &&
          checklist.length === 0 &&
          !columnTitle
        ) {
          continue;
        }
        out[key] = {
          assignees: [...(card.assignees || [])],
          participants: [...(card.participants || [])],
          fingerprint: card.kaitenMembersFingerprint ?? null,
          stageDue,
          timerStartedAt: card.timerStartedAt ?? null,
          timerDurationMs: card.timerDurationMs ?? null,
          timerFrozenAt: card.timerFrozenAt ?? null,
          checklist,
          columnTitle,
        };
      }
    }
  }
  return out;
}

/**
 * Не заменяет весь кэш: пустой paint (F5 / зеркало без людей) не должен
 * выкидывать ключи, которые уже были сохранены.
 * Пустые people в incoming не затирают непустые в existing.
 */
export function mergeKanbanCardHeadsCache(
  existing: KanbanCardHeadsCache | null,
  incoming: KanbanCardHeadsCache,
): KanbanCardHeadsCache {
  const out: KanbanCardHeadsCache = { ...(existing ?? {}) };
  for (const [key, row] of Object.entries(incoming)) {
    const prev = out[key];
    const incomingHasMembers =
      (row.assignees?.length ?? 0) > 0 || (row.participants?.length ?? 0) > 0;
    const incomingDue = (row.stageDue || "").trim();
    if (!prev) {
      out[key] = {
        assignees: [...(row.assignees || [])],
        participants: [...(row.participants || [])],
        fingerprint: row.fingerprint ?? null,
        stageDue: incomingDue,
        timerStartedAt: row.timerStartedAt ?? null,
        timerDurationMs: row.timerDurationMs ?? null,
        timerFrozenAt: row.timerFrozenAt ?? null,
        checklist: slimChecklist(row.checklist),
        columnTitle: (row.columnTitle || "").trim(),
      };
      continue;
    }
    out[key] = {
      assignees: incomingHasMembers
        ? [...(row.assignees || [])]
        : [...(prev.assignees || [])],
      participants: incomingHasMembers
        ? [...(row.participants || [])]
        : [...(prev.participants || [])],
      fingerprint: incomingHasMembers
        ? (row.fingerprint ?? null)
        : (prev.fingerprint ?? row.fingerprint ?? null),
      stageDue: incomingDue || prev.stageDue || "",
      timerStartedAt: headHasTimer(row) ? row.timerStartedAt ?? null : prev.timerStartedAt ?? null,
      timerDurationMs: headHasTimer(row) ? row.timerDurationMs ?? null : prev.timerDurationMs ?? null,
      timerFrozenAt: headHasTimer(row) ? row.timerFrozenAt ?? null : prev.timerFrozenAt ?? null,
      checklist:
        (row.checklist?.length ?? 0) > 0 ? slimChecklist(row.checklist) : slimChecklist(prev.checklist),
      columnTitle: (row.columnTitle || "").trim() || prev.columnTitle || "",
    };
  }
  return out;
}

function writeHeadsCache(heads: KanbanCardHeadsCache): void {
  if (typeof window === "undefined") return;
  if (Object.keys(heads).length === 0) return;
  window.localStorage.setItem(KANBAN_CARD_HEADS_CACHE_KEY, JSON.stringify(heads));
}

export function persistKanbanCardHeadsCache(state: KanbanAppState): void {
  if (typeof window === "undefined") return;
  try {
    const incoming = collectKanbanCardHeadsCache(state);
    const merged = mergeKanbanCardHeadsCache(loadKanbanCardHeadsCache(), incoming);
    writeHeadsCache(merged);
  } catch {
    /* quota / private mode */
  }
}

/** Явная смена людей на карточке (в т.ч. снятие всех) — одна строка кэша. */
export function upsertKanbanCardHeadCache(card: KanbanCard): void {
  if (typeof window === "undefined") return;
  try {
    const key = cacheKeyForCard(card);
    if (!key) return;
    const existing = loadKanbanCardHeadsCache() ?? {};
    existing[key] = {
      assignees: [...(card.assignees || [])],
      participants: [...(card.participants || [])],
      fingerprint: card.kaitenMembersFingerprint ?? null,
      stageDue: getKanbanStageDue(card),
      timerStartedAt: card.timerStartedAt ?? null,
      timerDurationMs: card.timerDurationMs ?? null,
      timerFrozenAt: card.timerFrozenAt ?? null,
      checklist: slimChecklist(card.checklist),
      columnTitle: existing[key]?.columnTitle || "",
    };
    writeHeadsCache(existing);
  } catch {
    /* quota / private mode */
  }
}

export function upsertKanbanCardColumnCache(
  card: Pick<KanbanCard, "id" | "linkedOrderId">,
  columnTitle: string,
): void {
  if (typeof window === "undefined") return;
  const title = columnTitle.trim();
  if (!title) return;
  try {
    const key = cacheKeyForCard(card);
    if (!key) return;
    const existing = loadKanbanCardHeadsCache() ?? {};
    const prev = existing[key];
    existing[key] = {
      assignees: [...(prev?.assignees || [])],
      participants: [...(prev?.participants || [])],
      fingerprint: prev?.fingerprint ?? null,
      stageDue: prev?.stageDue || "",
      timerStartedAt: prev?.timerStartedAt ?? null,
      timerDurationMs: prev?.timerDurationMs ?? null,
      timerFrozenAt: prev?.timerFrozenAt ?? null,
      checklist: slimChecklist(prev?.checklist),
      columnTitle: title,
    };
    writeHeadsCache(existing);
  } catch {
    /* quota / private mode */
  }
}

export function loadKanbanCardHeadsCache(): KanbanCardHeadsCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KANBAN_CARD_HEADS_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    return data as KanbanCardHeadsCache;
  } catch {
    return null;
  }
}

export const KANBAN_STICKY_LINKED_OIDS_KEY = "kanban-sticky-linked-oids-v1";
const STICKY_LINKED_OIDS_CAP = 400;

export function lookupKanbanCardHead(
  heads: KanbanCardHeadsCache | null | undefined,
  card: Pick<KanbanCard, "id" | "linkedOrderId">,
): KanbanCardHeadCacheRow | null {
  if (!heads) return null;
  const oid = String(card.linkedOrderId || "").trim();
  if (oid) {
    const row = heads[`oid:${oid}`];
    if (row) return row;
  }
  const id = String(card.id || "").trim();
  if (!id) return null;
  return heads[`id:${id}`] ?? null;
}

function uniqMemberIds(...lists: Array<readonly string[] | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const raw of list || []) {
      const id = String(raw || "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * Люди для «МОИ» / «Ответственный».
 * Если на карточке уже есть ответственные/участники — только они (кэш шапки
 * устаревает и иначе оставляет чужие карточки). Кэш — только когда массивы пустые (F5 / slim).
 */
export function membersForKanbanAggregateKeep(
  card: Pick<KanbanCard, "id" | "linkedOrderId" | "assignees" | "participants">,
  heads: KanbanCardHeadsCache | null | undefined,
): { assignees: string[]; participants: string[] } {
  if (hasKanbanCardMembers(card)) {
    return {
      assignees: uniqMemberIds(card.assignees),
      participants: uniqMemberIds(card.participants),
    };
  }
  const row = lookupKanbanCardHead(heads, card);
  return {
    assignees: uniqMemberIds(row?.assignees),
    participants: uniqMemberIds(row?.participants),
  };
}

export function loadStickyLinkedOrderIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KANBAN_STICKY_LINKED_OIDS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of data) {
      const oid = String(item || "").trim();
      if (!oid || seen.has(oid)) continue;
      seen.add(oid);
      out.push(oid);
      if (out.length >= STICKY_LINKED_OIDS_CAP) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function persistStickyLinkedOrderIds(ids: readonly string[]): void {
  if (typeof window === "undefined") return;
  try {
    const next = prependMissingLinkedOrderIds([], ids).slice(0, STICKY_LINKED_OIDS_CAP);
    window.localStorage.setItem(KANBAN_STICKY_LINKED_OIDS_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function mergeStickyLinkedOrderIds(
  current: readonly string[],
  extra: readonly string[],
): string[] {
  return prependMissingLinkedOrderIds(current, extra).slice(0, STICKY_LINKED_OIDS_CAP);
}

/** Наряды из кэша шапки: для «МОИ» — только где есть session user. */
export function collectLinkedOrderIdsFromHeadsCache(
  heads: KanbanCardHeadsCache | null,
  opts?: { sessionUserId?: string | null },
): string[] {
  if (!heads) return [];
  const uid = (opts?.sessionUserId ?? "").trim();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const [key, row] of Object.entries(heads)) {
    if (!key.startsWith("oid:")) continue;
    const oid = key.slice("oid:".length).trim();
    if (!oid || seen.has(oid)) continue;
    if (uid) {
      const inAssign = (row.assignees || []).includes(uid);
      const inParts = (row.participants || []).includes(uid);
      if (!inAssign && !inParts) continue;
    }
    seen.add(oid);
    out.push(oid);
  }
  return out;
}

/** Сначала наряды, которых нет на доске (кэш «МОИ»), потом уже лежащие. */
export function prependMissingLinkedOrderIds(
  onBoards: readonly string[],
  extra: readonly string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of extra) {
    const oid = String(raw || "").trim();
    if (!oid || seen.has(oid)) continue;
    seen.add(oid);
    out.push(oid);
  }
  for (const raw of onBoards) {
    const oid = String(raw || "").trim();
    if (!oid || seen.has(oid)) continue;
    seen.add(oid);
    out.push(oid);
  }
  return out;
}

export function applyKanbanCardHeadsCache(
  state: KanbanAppState,
  heads: KanbanCardHeadsCache | null,
): boolean {
  if (!heads) return false;
  let changed = false;
  forEachKanbanCardInState(state, (card) => {
    const key = cacheKeyForCard(card);
    if (!key) return;
    const row = heads[key];
    if (!row) return;
    if (
      shouldKeepLocalKanbanMembers(row, {
        assignees: card.assignees,
        participants: card.participants,
      })
    ) {
      card.assignees = [...(row.assignees || [])];
      card.participants = [...(row.participants || [])];
      if (row.fingerprint) card.kaitenMembersFingerprint = row.fingerprint;
      changed = true;
    }
    if (shouldKeepLocalKanbanStageDue(row.stageDue, getKanbanStageDue(card))) {
      setKanbanStageDue(card, row.stageDue);
      changed = true;
    }
    if (headHasTimer(row) && !headHasTimer(card)) {
      card.timerStartedAt = row.timerStartedAt ?? null;
      card.timerDurationMs = row.timerDurationMs ?? null;
      card.timerFrozenAt = row.timerFrozenAt ?? null;
      changed = true;
    }
    if ((row.checklist?.length ?? 0) > 0 && (card.checklist?.length ?? 0) === 0) {
      card.checklist = slimChecklist(row.checklist);
      changed = true;
    }
  });
  return changed;
}
