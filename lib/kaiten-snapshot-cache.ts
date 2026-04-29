/**
 * Кэш ответа GET /api/orders/[id]/kaiten — снижает число вызовов к API Kaiten
 * при повторных открытиях вкладки, React Strict Mode и нескольких клиентах.
 * TTL по умолчанию 12 с (`KAITEN_SNAPSHOT_CACHE_SEC`), 0 — отключить кэш.
 */
type Entry = { storedAt: number; payload: Record<string, unknown> };

const store = new Map<string, Entry>();

function ttlMs(): number {
  const raw = process.env.KAITEN_SNAPSHOT_CACHE_SEC;
  const sec = raw != null && raw.trim() ? Number.parseInt(raw.trim(), 10) : 12;
  if (!Number.isFinite(sec) || sec < 0) return 12_000;
  return Math.min(Math.max(sec, 0), 300) * 1000;
}

export function getKaitenSnapshotCache(orderId: string): Record<string, unknown> | null {
  const id = orderId.trim();
  if (!id) return null;
  const e = store.get(id);
  if (!e) return null;
  if (Date.now() - e.storedAt > ttlMs()) {
    store.delete(id);
    return null;
  }
  return e.payload;
}

export function setKaitenSnapshotCache(
  orderId: string,
  payload: Record<string, unknown>,
): void {
  const id = orderId.trim();
  if (!id) return;
  store.set(id, { storedAt: Date.now(), payload: { ...payload } });
}

export function invalidateKaitenSnapshotCache(orderId: string): void {
  store.delete(orderId.trim());
}
