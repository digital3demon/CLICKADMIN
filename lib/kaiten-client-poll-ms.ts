/**
 * Интервал опроса шапки Kaiten на открытом наряде (мс).
 * Списки используют kaitenListTitlesPollIntervalMs (~45 с) — не этот таймер.
 */
export function kaitenClientPollIntervalMs(): number {
  const raw = process.env.NEXT_PUBLIC_KAITEN_HEADER_POLL_MS;
  const n =
    raw != null && String(raw).trim()
      ? Number.parseInt(String(raw).trim(), 10)
      : 12_000;
  if (!Number.isFinite(n)) return 12_000;
  return Math.min(Math.max(n, 8000), 120_000);
}
