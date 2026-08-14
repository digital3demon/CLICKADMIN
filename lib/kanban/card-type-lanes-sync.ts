/**
 * Пространство типа карточки — отдельный tenant-ключ.
 * kanbanAppStateV3 периодически перезаписывается открытой доской без этих полей.
 */
import type { KanbanAppState } from "@/lib/kanban/types";
import {
  collectCardTypeDefaultLanes,
  normalizeCardTypeNameKey,
  resolveStoredTrackLane,
  type CardTypeTrackLane,
} from "@/lib/kanban/card-type-default-lane";

export const KANBAN_CARD_TYPE_LANES_KEY = "kanbanCardTypeDefaultLanesV1";

export type KanbanCardTypeLaneEntry = {
  id: string;
  name: string;
  defaultTrackLane: CardTypeTrackLane;
};

export type KanbanCardTypeLanesSnapshot = {
  version: 1;
  types: KanbanCardTypeLaneEntry[];
};

function emptySnapshot(): KanbanCardTypeLanesSnapshot {
  return { version: 1, types: [] };
}

function typeKey(id: string, name: string): string {
  const idKey = id.trim();
  if (idKey) return `id:${idKey}`;
  const nameKey = normalizeCardTypeNameKey(name);
  return nameKey ? `name:${nameKey}` : "";
}

export function normalizeKanbanCardTypeLanes(
  raw: unknown,
): KanbanCardTypeLanesSnapshot {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptySnapshot();
  }
  const obj = raw as { version?: unknown; types?: unknown };
  if (obj.version !== 1 || !Array.isArray(obj.types)) {
    return emptySnapshot();
  }
  const seen = new Set<string>();
  const types: KanbanCardTypeLaneEntry[] = [];
  for (const item of obj.types) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as {
      id?: unknown;
      name?: unknown;
      defaultTrackLane?: unknown;
    };
    const lane = resolveStoredTrackLane(String(row.defaultTrackLane ?? ""));
    if (!lane) continue;
    const id = String(row.id ?? "").trim();
    const name = String(row.name ?? "").trim();
    const key = typeKey(id, name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    types.push({ id, name, defaultTrackLane: lane });
  }
  return { version: 1, types };
}

/** Incoming с типами перекрывает fallback; пустой incoming не затирает уже сохранённое. */
export function mergeCardTypeLaneSnapshots(
  incoming: unknown,
  fallback: unknown,
): KanbanCardTypeLanesSnapshot {
  const next = normalizeKanbanCardTypeLanes(incoming);
  const prev = normalizeKanbanCardTypeLanes(fallback);
  if (next.types.length === 0) return prev;
  const byKey = new Map<string, KanbanCardTypeLaneEntry>();
  for (const t of prev.types) {
    const key = typeKey(t.id, t.name);
    if (key) byKey.set(key, t);
  }
  for (const t of next.types) {
    const key = typeKey(t.id, t.name);
    if (key) byKey.set(key, t);
  }
  return { version: 1, types: [...byKey.values()] };
}

export function extractKanbanCardTypeLanes(
  state: KanbanAppState,
): KanbanCardTypeLanesSnapshot {
  const byKey = new Map<string, KanbanCardTypeLaneEntry>();
  for (const board of state.boards) {
    for (const t of board.cardTypes || []) {
      const lane = resolveStoredTrackLane(t.defaultTrackLane);
      if (!lane) continue;
      const id = String(t.id ?? "").trim();
      const name = String(t.name ?? "").trim();
      const key = typeKey(id, name);
      if (!key) continue;
      byKey.set(key, { id, name, defaultTrackLane: lane });
    }
  }
  return { version: 1, types: [...byKey.values()] };
}

export function applyKanbanCardTypeLanes(
  state: KanbanAppState,
  snapshot: unknown,
): KanbanAppState {
  const snap = normalizeKanbanCardTypeLanes(snapshot);
  if (snap.types.length === 0) return state;
  const preserved = collectCardTypeDefaultLanes(snap.types);
  const next = structuredClone(state);
  let changed = false;
  for (const board of next.boards) {
    for (const t of board.cardTypes || []) {
      const id = String(t.id ?? "").trim();
      const nameKey = normalizeCardTypeNameKey(t.name);
      const lane =
        (id && preserved.byId.get(id)) ||
        (nameKey ? preserved.byName.get(nameKey) : undefined);
      if (!lane || t.defaultTrackLane === lane) continue;
      t.defaultTrackLane = lane;
      changed = true;
    }
  }
  return changed ? next : state;
}

export function defaultSpaceByCardTypeFromLaneSnapshot(
  raw: unknown,
): Record<string, CardTypeTrackLane> {
  const snap = normalizeKanbanCardTypeLanes(raw);
  const out: Record<string, CardTypeTrackLane> = {};
  for (const t of snap.types) {
    if (t.id) out[t.id] = t.defaultTrackLane;
    const nameKey = normalizeCardTypeNameKey(t.name);
    if (nameKey) out[`name:${nameKey}`] = t.defaultTrackLane;
  }
  return out;
}
