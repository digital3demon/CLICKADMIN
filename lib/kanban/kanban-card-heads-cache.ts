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
