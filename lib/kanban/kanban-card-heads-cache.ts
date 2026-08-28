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
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";

export const KANBAN_CARD_HEADS_CACHE_KEY = "kanban-card-heads-v1";

export type KanbanCardHeadCacheRow = {
  assignees: string[];
  participants: string[];
  fingerprint: string | null;
  stageDue: string;
};

export type KanbanCardHeadsCache = Record<string, KanbanCardHeadCacheRow>;

function cacheKeyForCard(card: KanbanCard): string | null {
  const oid = String(card.linkedOrderId || "").trim();
  if (oid) return `oid:${oid}`;
  const id = String(card.id || "").trim();
  return id ? `id:${id}` : null;
}

export function collectKanbanCardHeadsCache(
  state: KanbanAppState,
): KanbanCardHeadsCache {
  const out: KanbanCardHeadsCache = {};
  forEachKanbanCardInState(state, (card) => {
    const key = cacheKeyForCard(card);
    if (!key) return;
    const stageDue = getKanbanStageDue(card);
    if (!hasKanbanCardMembers(card) && !stageDue) return;
    out[key] = {
      assignees: [...(card.assignees || [])],
      participants: [...(card.participants || [])],
      fingerprint: card.kaitenMembersFingerprint ?? null,
      stageDue,
    };
  });
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

/** Живые люди карточки ∪ кэш шапки (F5 / slim часто обнуляют массивы). */
export function membersForKanbanAggregateKeep(
  card: Pick<KanbanCard, "id" | "linkedOrderId" | "assignees" | "participants">,
  heads: KanbanCardHeadsCache | null | undefined,
): { assignees: string[]; participants: string[] } {
  const row = lookupKanbanCardHead(heads, card);
  return {
    assignees: uniqMemberIds(card.assignees, row?.assignees),
    participants: uniqMemberIds(card.participants, row?.participants),
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
  });
  return changed;
}
