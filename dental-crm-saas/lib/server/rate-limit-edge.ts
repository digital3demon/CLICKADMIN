/**
 * Простое скользящее окно для Edge middleware (один инстанс Node — типичный standalone).
 * Не подходит для serverless с множеством изолятов без общего Redis.
 */

type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();

/** Окно и лимит можно переопределить через env (для тестов). */
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const MAX_REQUESTS =
  Number(process.env.RATE_LIMIT_MAX_PER_WINDOW) || 240;

let pruneCounter = 0;

function pruneStale(now: number) {
  if (++pruneCounter % 300 !== 0) return;
  const cutoff = now - WINDOW_MS * 2;
  for (const [k, v] of store) {
    if (v.windowStart < cutoff) store.delete(k);
  }
}

/** true — запрос разрешён, false — 429. */
export function rateLimitAllow(clientKey: string): boolean {
  const now = Date.now();
  pruneStale(now);
  let e = store.get(clientKey);
  if (!e || now - e.windowStart >= WINDOW_MS) {
    store.set(clientKey, { count: 1, windowStart: now });
    return true;
  }
  if (e.count >= MAX_REQUESTS) return false;
  e.count += 1;
  return true;
}
