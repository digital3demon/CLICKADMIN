/**
 * Кэш прайса в сессии вкладки: повторное «Добавить» не качает каталог заново.
 */
const TTL_MS = 5 * 60_000;

type CacheRow<T> = { at: number; data: T };

const store = new Map<string, CacheRow<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function priceListItemsCacheKey(input: {
  slim?: boolean;
  clinicId?: string | null;
  doctorId?: string | null;
  listId?: string | null;
  code?: string | null;
}): string {
  return [
    input.slim ? "slim" : "full",
    (input.listId || "").trim(),
    (input.clinicId || "").trim(),
    (input.doctorId || "").trim(),
    (input.code || "").trim(),
  ].join("|");
}

export function readPriceListItemsCache<T>(key: string, now = Date.now()): T | null {
  const row = store.get(key) as CacheRow<T> | undefined;
  if (!row) return null;
  if (now - row.at > TTL_MS) {
    store.delete(key);
    return null;
  }
  return row.data;
}

export function writePriceListItemsCache<T>(key: string, data: T, now = Date.now()): void {
  store.set(key, { at: now, data });
}

export function invalidatePriceListItemsClientCache(): void {
  store.clear();
  inflight.clear();
}

export async function fetchPriceListItemsCached<T>(
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const hit = readPriceListItemsCache<T>(key);
  if (hit) return hit;
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const p = load()
    .then((data) => {
      writePriceListItemsCache(key, data);
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}
