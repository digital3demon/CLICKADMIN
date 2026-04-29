/** Интервал опроса Kaiten в клиентских списках и шапке наряда (мс). */
export function kaitenClientPollIntervalMs(): number {
  const raw = process.env.NEXT_PUBLIC_KAITEN_HEADER_POLL_MS;
  const n =
    raw != null && String(raw).trim()
      ? Number.parseInt(String(raw).trim(), 10)
      : 2000;
  if (!Number.isFinite(n)) return 2000;
  return Math.min(Math.max(n, 1500), 120_000);
}
