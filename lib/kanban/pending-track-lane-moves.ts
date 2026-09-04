/**
 * Локальный перенос на дорожку (Ортопедия ↔ Ортодонтия), пока плитка CRM ещё со старым trackLane.
 * Иначе полный GET /board-tiles с replaceBoardId вычищает карточку с новой доски.
 */
const STORAGE_KEY = "kanbanPendingTrackLanesV1";
const TTL_MS = 120_000;

export type PendingKanbanTrackLane = {
  cardId: string;
  orderId?: string;
  trackLane: "ORTHOPEDICS" | "ORTHODONTICS";
  at: number;
};

let memoryStore: PendingKanbanTrackLane[] = [];

function readStore(): PendingKanbanTrackLane[] {
  if (typeof sessionStorage === "undefined") return memoryStore;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is PendingKanbanTrackLane => {
      if (!x || typeof x !== "object") return false;
      const row = x as PendingKanbanTrackLane;
      return (
        typeof row.cardId === "string" &&
        (row.trackLane === "ORTHOPEDICS" || row.trackLane === "ORTHODONTICS")
      );
    });
  } catch {
    return [];
  }
}

function writeStore(rows: PendingKanbanTrackLane[]): void {
  memoryStore = rows;
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* quota / private mode */
  }
}

export function clearPendingKanbanTrackLanesForTests(): void {
  memoryStore = [];
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* */
    }
  }
}

export function rememberPendingKanbanTrackLane(
  move: Omit<PendingKanbanTrackLane, "at">,
): void {
  const now = Date.now();
  const next = readStore().filter(
    (r) => now - r.at < TTL_MS && r.cardId !== move.cardId,
  );
  next.push({ ...move, at: now });
  writeStore(next);
}

export function listPendingKanbanTrackLanes(
  now = Date.now(),
): PendingKanbanTrackLane[] {
  const live = readStore().filter((r) => now - r.at < TTL_MS);
  if (live.length !== readStore().length) writeStore(live);
  return live;
}

export function clearPendingKanbanTrackLane(cardId: string): void {
  writeStore(
    readStore().filter((r) => r.cardId !== cardId && r.orderId !== cardId),
  );
}

export function pendingTrackLaneForOrder(
  orderId: string,
  moves: readonly PendingKanbanTrackLane[],
): PendingKanbanTrackLane["trackLane"] | null {
  const oid = String(orderId || "").trim();
  if (!oid) return null;
  const move = moves.find((m) => m.orderId === oid || m.cardId === oid);
  return move?.trackLane ?? null;
}

/** Когда плитка уже с целевой дорожкой — pending больше не нужен. */
export function clearPendingTrackLanesConfirmedByTiles(
  tiles: readonly { orderId: string; trackLane: string | null }[],
): void {
  const live = listPendingKanbanTrackLanes();
  if (!live.length) return;
  const confirmed = new Set<string>();
  for (const tile of tiles) {
    const want = pendingTrackLaneForOrder(tile.orderId, live);
    if (!want) continue;
    const have = String(tile.trackLane || "")
      .trim()
      .toUpperCase();
    if (have === want) confirmed.add(tile.orderId);
  }
  if (!confirmed.size) return;
  writeStore(
    live.filter(
      (m) => !confirmed.has(m.orderId || "") && !confirmed.has(m.cardId),
    ),
  );
}
