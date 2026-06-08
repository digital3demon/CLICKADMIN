/**
 * Лимиты Kaiten REST API (документация / OpenAPI: ~5 запросов в секунду на токен,
 * при превышении — HTTP 429 и заголовки X-RateLimit-Remaining / X-RateLimit-Reset).
 * @see https://developers.kaiten.ru/
 */

/** Ориентир для планирования фоновых опросов (не жёсткая константа сервера). */
export const KAITEN_DOCUMENTED_REQUESTS_PER_SEC = 5;

/** Минимальный интервал между любыми запросами (мс), даже с приоритетом пользователя. */
export const KAITEN_MIN_GAP_MS = Math.ceil(
  1000 / KAITEN_DOCUMENTED_REQUESTS_PER_SEC,
);

/**
 * Минимальная пауза между запросами в глобальной очереди `kaitenFetch` (мс).
 * 220 мс ≈ 4.5 req/s — запас под PATCH карточки и фоновый синк.
 */
export function kaitenSafeRequestSpacingMs(): number {
  const raw = process.env.KAITEN_REQUEST_SPACING_MS;
  const n =
    raw != null && String(raw).trim()
      ? Number.parseInt(String(raw).trim(), 10)
      : 220;
  if (!Number.isFinite(n) || n < 0) return 220;
  return Math.min(Math.max(n, 200), 2000);
}

/**
 * Интервал повторного live-синка «!!!»/«???» для узкого списка (мс).
 * По умолчанию 12 с — не чаще фонового опроса колонок.
 */
export function kaitenFastLivePollIntervalMs(): number {
  const raw = process.env.NEXT_PUBLIC_KAITEN_FAST_LIVE_POLL_MS;
  const n =
    raw != null && String(raw).trim()
      ? Number.parseInt(String(raw).trim(), 10)
      : 12_000;
  if (!Number.isFinite(n)) return 12_000;
  return Math.min(Math.max(n, 8000), 120_000);
}

/** HTTP 429 от Kaiten после исчерпания повторов в kaitenFetch. */
export function isKaitenRateLimitedStatus(status: number): boolean {
  return status === 429;
}

/** Заголовок Retry-After для ответов CRM клиенту (секунды). */
export function kaitenRetryAfterSeconds(): string {
  return "90";
}
