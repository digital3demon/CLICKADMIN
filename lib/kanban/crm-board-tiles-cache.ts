/**
 * Последние плитки доски в localStorage — F5 рисует прошлый снимок,
 * пока GET /board-tiles ещё идёт (3–5 с на полной ортодонтии).
 */
import {
  kanbanBoardIdFromTrackLane,
  type CrmBoardTile,
} from "@/lib/kanban/crm-board-tile";
import type { KanbanLinkedAppointmentSnap } from "@/lib/kanban/kanban-actual-appointment";
import {
  listPendingKanbanColumnMoves,
  pendingColumnTitleForOrder,
} from "@/lib/kanban/pending-column-moves";
import {
  listPendingKanbanBlocks,
  pendingBlockForOrder,
} from "@/lib/kanban/pending-kanban-blocks";
import {
  listPendingKanbanTrackLanes,
  pendingTrackLaneForOrder,
} from "@/lib/kanban/pending-track-lane-moves";

function overlayPendingOnTiles(tiles: readonly CrmBoardTile[]): CrmBoardTile[] {
  const pendingCols = listPendingKanbanColumnMoves();
  const pendingBlocks = listPendingKanbanBlocks();
  const pendingLanes = listPendingKanbanTrackLanes();
  if (!pendingCols.length && !pendingBlocks.length && !pendingLanes.length) {
    return [...tiles];
  }
  return tiles.map((t) => {
    let next = t;
    const title = pendingColumnTitleForOrder(t.orderId, pendingCols);
    if (title) next = { ...next, columnTitle: title };
    const block = pendingBlockForOrder(t.orderId, pendingBlocks);
    if (block) {
      next = {
        ...next,
        blocked: block.blocked,
        blockReason: block.blocked ? block.blockReason : "",
      };
    }
    const lane = pendingTrackLaneForOrder(t.orderId, pendingLanes);
    if (lane) {
      next = {
        ...next,
        trackLane: lane,
        boardId: kanbanBoardIdFromTrackLane(lane),
      };
    }
    return next;
  });
}

export const CRM_BOARD_TILES_CACHE_KEY = "kanban-board-tiles-v1";
const CACHE_VERSION = 1;
const MAX_CACHED_BOARDS = 3;
let memoryFallback: string | null = null;

function storageGet(): string | null {
  if (typeof window === "undefined") return memoryFallback;
  return window.localStorage.getItem(CRM_BOARD_TILES_CACHE_KEY);
}

function storageSet(value: string): void {
  if (typeof window === "undefined") {
    memoryFallback = value;
    return;
  }
  window.localStorage.setItem(CRM_BOARD_TILES_CACHE_KEY, value);
}

type TilesCacheStore = {
  v: number;
  order: string[];
  byBoard: Record<string, CrmBoardTile[]>;
};

function isTile(raw: unknown): raw is CrmBoardTile {
  if (!raw || typeof raw !== "object") return false;
  const t = raw as Record<string, unknown>;
  return (
    typeof t.orderId === "string" &&
    Boolean(t.orderId.trim()) &&
    typeof t.boardId === "string" &&
    typeof t.title === "string"
  );
}

function emptyStore(): TilesCacheStore {
  return { v: CACHE_VERSION, order: [], byBoard: {} };
}

function readStore(): TilesCacheStore {
  try {
    const raw = storageGet();
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<TilesCacheStore>;
    if (parsed?.v !== CACHE_VERSION || !parsed.byBoard || typeof parsed.byBoard !== "object") {
      return emptyStore();
    }
    const byBoard: Record<string, CrmBoardTile[]> = {};
    for (const [boardId, rows] of Object.entries(parsed.byBoard)) {
      if (!Array.isArray(rows)) continue;
      const tiles = rows.filter(isTile);
      if (tiles.length) byBoard[boardId] = tiles;
    }
    const order = (Array.isArray(parsed.order) ? parsed.order : [])
      .map((id) => String(id || "").trim())
      .filter((id) => byBoard[id]);
    return { v: CACHE_VERSION, order, byBoard };
  } catch {
    return emptyStore();
  }
}

export function loadCrmBoardTilesCache(boardId: string): CrmBoardTile[] {
  const id = String(boardId || "").trim();
  if (!id) return [];
  return readStore().byBoard[id] ?? [];
}

/** Дельта `since` не затирает полный снимок — иначе F5 теряет типы/людей. */
export function mergeCrmBoardTilesCache(
  boardId: string,
  tiles: readonly CrmBoardTile[],
): void {
  const id = String(boardId || "").trim();
  if (!id) return;
  const incoming = tiles.filter(isTile);
  if (incoming.length === 0) return;
  const prev = loadCrmBoardTilesCache(id);
  if (prev.length === 0) {
    saveCrmBoardTilesCache(id, incoming);
    return;
  }
  const byId = new Map(prev.map((t) => [t.orderId, t]));
  for (const t of incoming) byId.set(t.orderId, t);
  saveCrmBoardTilesCache(id, overlayPendingOnTiles([...byId.values()]));
}

/** Сразу после переноса в CRM — F5 не читает старую колонку из кэша плиток. */
export function patchCrmBoardTilesCacheColumn(
  orderId: string,
  columnTitle: string,
): void {
  const oid = String(orderId || "").trim();
  const title = columnTitle.trim();
  if (!oid || !title) return;
  const store = readStore();
  let dirty = false;
  for (const [boardId, tiles] of Object.entries(store.byBoard)) {
    let changed = false;
    const next = tiles.map((t) => {
      if (t.orderId !== oid) return t;
      if ((t.columnTitle || "").trim() === title) return t;
      changed = true;
      return { ...t, columnTitle: title };
    });
    if (changed) {
      store.byBoard[boardId] = next;
      dirty = true;
    }
  }
  if (!dirty) return;
  try {
    storageSet(JSON.stringify(store));
  } catch {
    /* квота */
  }
}

/** Сразу после смены доски — F5 не кладёт карточку на старую дорожку. */
export function patchCrmBoardTilesCacheTrackLane(
  orderId: string,
  trackLane: string,
): void {
  const oid = String(orderId || "").trim();
  const lane = String(trackLane || "").trim().toUpperCase();
  if (!oid || !lane) return;
  const nextBoardId = kanbanBoardIdFromTrackLane(lane);
  const store = readStore();
  let moved: CrmBoardTile | null = null;
  let dirty = false;
  for (const [boardId, tiles] of Object.entries(store.byBoard)) {
    const idx = tiles.findIndex((t) => t.orderId === oid);
    if (idx < 0) continue;
    const [tile] = tiles.splice(idx, 1);
    if (!tile) continue;
    moved = { ...tile, trackLane: lane, boardId: nextBoardId };
    store.byBoard[boardId] = tiles;
    dirty = true;
  }
  if (moved) {
    const dest = store.byBoard[nextBoardId] ?? [];
    store.byBoard[nextBoardId] = [
      moved,
      ...dest.filter((t) => t.orderId !== oid),
    ];
    store.order = [nextBoardId, ...store.order.filter((x) => x !== nextBoardId)].slice(
      0,
      MAX_CACHED_BOARDS,
    );
    dirty = true;
  }
  if (!dirty) return;
  try {
    storageSet(JSON.stringify(store));
  } catch {
    /* квота */
  }
}

/** Сразу после смены таймера — F5 не поднимает старый живой отсчёт из кэша плиток. */
export function patchCrmBoardTilesCacheTimer(
  orderId: string,
  timer: Pick<
    CrmBoardTile,
    | "timerStartedAt"
    | "timerDurationMs"
    | "timerFrozenAt"
    | "timerStartedByUserId"
    | "timerParkedAt"
    | "timerParkedRemainingMs"
  >,
): void {
  const oid = String(orderId || "").trim();
  if (!oid) return;
  const store = readStore();
  let dirty = false;
  for (const [boardId, tiles] of Object.entries(store.byBoard)) {
    let changed = false;
    const next = tiles.map((t) => {
      if (t.orderId !== oid) return t;
      changed = true;
      return { ...t, ...timer };
    });
    if (changed) {
      store.byBoard[boardId] = next;
      dirty = true;
    }
  }
  if (!dirty) return;
  try {
    storageSet(JSON.stringify(store));
  } catch {
    /* квота */
  }
}

/** Сразу после блокировки/разблокировки — F5 не поднимает старый стоп из кэша плиток. */
export function patchCrmBoardTilesCacheBlock(
  orderId: string,
  block: Pick<CrmBoardTile, "blocked" | "blockReason">,
): void {
  const oid = String(orderId || "").trim();
  if (!oid) return;
  const store = readStore();
  let dirty = false;
  const blocked = block.blocked === true;
  const blockReason = blocked ? String(block.blockReason || "").trim() : "";
  for (const [boardId, tiles] of Object.entries(store.byBoard)) {
    let changed = false;
    const next = tiles.map((t) => {
      if (t.orderId !== oid) return t;
      if (Boolean(t.blocked) === blocked && (t.blockReason || "").trim() === blockReason) {
        return t;
      }
      changed = true;
      return { ...t, blocked, blockReason };
    });
    if (changed) {
      store.byBoard[boardId] = next;
      dirty = true;
    }
  }
  if (!dirty) return;
  try {
    storageSet(JSON.stringify(store));
  } catch {
    /* квота */
  }
}

export function saveCrmBoardTilesCache(
  boardId: string,
  tiles: readonly CrmBoardTile[],
): void {
  const id = String(boardId || "").trim();
  if (!id) return;
  const clean = overlayPendingOnTiles(tiles.filter(isTile));
  const store = readStore();
  store.byBoard[id] = clean;
  store.order = [id, ...store.order.filter((x) => x !== id)].slice(
    0,
    MAX_CACHED_BOARDS,
  );
  for (const key of Object.keys(store.byBoard)) {
    if (!store.order.includes(key)) delete store.byBoard[key];
  }
  try {
    storageSet(JSON.stringify(store));
  } catch {
    /* квота — следующий F5 просто подождёт сеть */
  }
}

export function clearCrmBoardTilesCacheForTests(): void {
  memoryFallback = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CRM_BOARD_TILES_CACHE_KEY);
  }
}

export function appointmentSnapsFromCrmTiles(
  tiles: readonly Pick<
    CrmBoardTile,
    "orderId" | "orderNumber" | "appointmentDate" | "dueToAdminsAt" | "dueToAdminsHasTime"
  >[],
): Map<string, KanbanLinkedAppointmentSnap> {
  const out = new Map<string, KanbanLinkedAppointmentSnap>();
  for (const t of tiles) {
    const oid = String(t.orderId || "").trim();
    if (!oid) continue;
    out.set(oid, {
      orderNumber: String(t.orderNumber || "").trim(),
      appointmentDate: t.appointmentDate ?? null,
      dueToAdminsAt: t.dueToAdminsAt ?? null,
      dueToAdminsHasTime: t.dueToAdminsHasTime ?? null,
    });
  }
  return out;
}
