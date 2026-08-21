/**
 * Простое скользящее окно для Edge middleware (один инстанс Node — типичный standalone).
 * Не подходит для serverless с множеством изолятов без общего Redis.
 */

type Entry = { count: number; windowStart: number; windowMs: number };

const store = new Map<string, Entry>();

/** Окно и лимит можно переопределить через env (для тестов). */
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
export const RATE_LIMIT_AUTH_MAX_PER_WINDOW =
  Number(process.env.RATE_LIMIT_AUTH_MAX_PER_WINDOW) ||
  Number(process.env.RATE_LIMIT_MAX_PER_WINDOW) ||
  5_000;
export const RATE_LIMIT_IP_MAX_PER_WINDOW =
  Number(process.env.RATE_LIMIT_IP_MAX_PER_WINDOW) || 300;

/** Вход: офисный NAT — не 10/5 мин на IP. */
export const AUTH_LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_LOGIN_IP_MAX = 60;
export const AUTH_LOGIN_EMAIL_MAX = 10;

let pruneCounter = 0;

function pruneStale(now: number) {
  if (++pruneCounter % 300 !== 0) return;
  for (const [k, v] of store) {
    if (now - v.windowStart > v.windowMs * 2) store.delete(k);
  }
}

/** true — запрос разрешён, false — 429. */
export function rateLimitAllow(
  clientKey: string,
  maxRequests: number,
  windowMs: number = WINDOW_MS,
): boolean {
  const now = Date.now();
  pruneStale(now);
  let e = store.get(clientKey);
  if (!e || now - e.windowStart >= e.windowMs) {
    store.set(clientKey, { count: 1, windowStart: now, windowMs });
    return true;
  }
  if (e.count >= maxRequests) return false;
  e.count += 1;
  return true;
}
