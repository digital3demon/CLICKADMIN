/**
 * Локальная блокировка карточки, пока плитка CRM / Kaiten ещё со старым флагом.
 * F5 не должен снимать стоп, который пользователь только что поставил.
 */
const STORAGE_KEY = "kanbanPendingBlocksV1";
const TTL_MS = 120_000;

export type PendingKanbanBlock = {
  cardId: string;
  orderId?: string;
  blocked: boolean;
  blockReason: string;
  blockedAt: string | null;
  at: number;
};

let memoryStore: PendingKanbanBlock[] = [];

function readStore(): PendingKanbanBlock[] {
  if (typeof sessionStorage === "undefined") return memoryStore;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is PendingKanbanBlock => {
      return Boolean(x && typeof x === "object" && typeof (x as PendingKanbanBlock).cardId === "string");
    });
  } catch {
    return [];
  }
}

function writeStore(rows: PendingKanbanBlock[]): void {
  memoryStore = rows;
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* quota / private mode */
  }
}

export function clearPendingKanbanBlocksForTests(): void {
  memoryStore = [];
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* */
    }
  }
}

export function rememberPendingKanbanBlock(
  block: Omit<PendingKanbanBlock, "at">,
): void {
  const now = Date.now();
  const next = readStore().filter((r) => now - r.at < TTL_MS && r.cardId !== block.cardId);
  next.push({ ...block, at: now });
  writeStore(next);
}

export function listPendingKanbanBlocks(now = Date.now()): PendingKanbanBlock[] {
  const live = readStore().filter((r) => now - r.at < TTL_MS);
  if (live.length !== readStore().length) writeStore(live);
  return live;
}

export function clearPendingKanbanBlock(cardId: string): void {
  writeStore(readStore().filter((r) => r.cardId !== cardId && r.orderId !== cardId));
}

export function pendingBlockForOrder(
  orderId: string,
  blocks: readonly PendingKanbanBlock[],
): PendingKanbanBlock | null {
  const oid = String(orderId || "").trim();
  if (!oid) return null;
  return blocks.find((m) => m.orderId === oid || m.cardId === oid) ?? null;
}

export function applyPendingBlockToCard(
  card: { blocked: boolean; blockReason: string; blockedAt?: string; blockedByUserId?: string },
  pending: PendingKanbanBlock,
): void {
  card.blocked = pending.blocked;
  card.blockReason = pending.blocked ? pending.blockReason : "";
  if (pending.blocked) {
    if (pending.blockedAt) card.blockedAt = pending.blockedAt;
  } else {
    card.blockedAt = "";
    card.blockedByUserId = "";
  }
}

/** Когда плитка уже с тем же стопом — pending больше не нужен. */
export function clearPendingBlocksConfirmedByTiles(
  tiles: readonly { orderId: string; blocked: boolean; blockReason: string }[],
): void {
  const live = listPendingKanbanBlocks();
  if (!live.length) return;
  const confirmed = new Set<string>();
  for (const tile of tiles) {
    const pending = pendingBlockForOrder(tile.orderId, live);
    if (!pending) continue;
    const sameFlag = Boolean(tile.blocked) === pending.blocked;
    const sameReason =
      (tile.blockReason || "").trim() === (pending.blockReason || "").trim();
    if (sameFlag && (!pending.blocked || sameReason)) {
      confirmed.add(tile.orderId);
    }
  }
  if (!confirmed.size) return;
  writeStore(
    live.filter(
      (m) => !confirmed.has(m.orderId || "") && !confirmed.has(m.cardId),
    ),
  );
}
