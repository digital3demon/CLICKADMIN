/**
 * Короткий кэш getSessionFromCookies по sid (+ demo + view-as).
 * TTL ~10 с: revoke / смена роли / addonKanban могут отставать до истечения;
 * logout и revoke обязаны сбрасывать запись, иначе устаревший hit = «ещё вошли».
 */
export const SESSION_LOOKUP_CACHE_TTL_MS = 10_000;

export type SessionLookupCacheEntry<T> = {
  at: number;
  value: T;
};

const store = new Map<string, SessionLookupCacheEntry<unknown>>();

export function sessionLookupCacheKey(input: {
  sid: string;
  demo: boolean;
  viewAsRaw: string;
}): string {
  return `${input.demo ? "d" : "s"}:${input.sid}|va:${input.viewAsRaw}`;
}

export function readSessionLookupCache<T>(
  key: string,
  now = Date.now(),
): T | undefined {
  const row = store.get(key);
  if (!row) return undefined;
  if (now - row.at > SESSION_LOOKUP_CACHE_TTL_MS) {
    store.delete(key);
    return undefined;
  }
  return row.value as T;
}

export function writeSessionLookupCache<T>(
  key: string,
  value: T,
  now = Date.now(),
): void {
  store.set(key, { at: now, value });
}

export function invalidateSessionLookupCacheBySid(sid: string): void {
  const needle = `:${sid}|va:`;
  for (const key of store.keys()) {
    if (key.includes(needle)) store.delete(key);
  }
}

export function invalidateSessionLookupCacheByUserId(userId: string): void {
  const uid = userId.trim();
  if (!uid) return;
  for (const [key, row] of store) {
    const value = row.value as { sub?: string } | null;
    if (value && value.sub === uid) store.delete(key);
  }
}

export function clearSessionLookupCacheForTests(): void {
  store.clear();
}
