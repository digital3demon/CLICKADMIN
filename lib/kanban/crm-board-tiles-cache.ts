/**
 * Последние плитки доски в localStorage — F5 рисует прошлый снимок,
 * пока GET /board-tiles ещё идёт (3–5 с на полной ортодонтии).
 */
import type { CrmBoardTile } from "@/lib/kanban/crm-board-tile";
import type { KanbanLinkedAppointmentSnap } from "@/lib/kanban/kanban-actual-appointment";

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
  saveCrmBoardTilesCache(id, [...byId.values()]);
}

export function saveCrmBoardTilesCache(
  boardId: string,
  tiles: readonly CrmBoardTile[],
): void {
  const id = String(boardId || "").trim();
  if (!id) return;
  const clean = tiles.filter(isTile);
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
