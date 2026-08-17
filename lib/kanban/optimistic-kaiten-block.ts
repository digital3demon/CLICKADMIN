/**
 * Пока PATCH блокировки догоняет Kaiten/БД, merge linked-orders
 * не должен откатывать карточку на старый kaitenBlocked / причину.
 */
export const OPTIMISTIC_KAITEN_BLOCK_TTL_MS = 45_000;
export const OPTIMISTIC_KAITEN_BLOCK_SHORT_TTL_MS = 12_000;

export type OptimisticKaitenBlock = {
  until: number;
  blocked: boolean;
  blockReason: string;
  blockedAt: string | null;
};

const map = new Map<string, OptimisticKaitenBlock>();

export function rememberOptimisticKaitenBlock(
  orderId: string,
  fields: {
    blocked: boolean;
    blockReason?: string | null;
    blockedAt?: string | null;
  },
  ttlMs = OPTIMISTIC_KAITEN_BLOCK_TTL_MS,
): void {
  const id = orderId.trim();
  if (!id) return;
  const blocked = fields.blocked === true;
  map.set(id, {
    until: Date.now() + ttlMs,
    blocked,
    blockReason: blocked ? String(fields.blockReason || "").trim() : "",
    blockedAt: blocked
      ? (fields.blockedAt?.trim() || new Date().toISOString())
      : null,
  });
}

export function forgetOptimisticKaitenBlock(orderId: string): void {
  const id = orderId.trim();
  if (id) map.delete(id);
}

export function applyOptimisticKaitenBlocksToLinkedRows<
  T extends {
    id: string;
    kaitenBlocked: boolean;
    kaitenBlockReason: string | null;
    kaitenBlockedAt: string | null;
  },
>(rows: T[], nowMs = Date.now()): T[] {
  for (const [id, opt] of map) {
    if (nowMs >= opt.until) map.delete(id);
  }
  if (map.size === 0) return rows;
  return rows.map((row) => {
    const opt = map.get(row.id);
    if (!opt) return row;
    const matched =
      !!row.kaitenBlocked === opt.blocked &&
      (row.kaitenBlockReason || "").trim() === opt.blockReason;
    if (matched) {
      map.delete(row.id);
      return row;
    }
    return {
      ...row,
      kaitenBlocked: opt.blocked,
      kaitenBlockReason: opt.blocked ? opt.blockReason || null : null,
      kaitenBlockedAt: opt.blocked ? opt.blockedAt : null,
    };
  });
}
