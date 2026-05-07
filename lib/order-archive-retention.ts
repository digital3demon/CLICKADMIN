export const DEFAULT_ORDER_ARCHIVE_RETENTION_DAYS = 30;
export const MIN_ORDER_ARCHIVE_RETENTION_DAYS = 1;
export const MAX_ORDER_ARCHIVE_RETENTION_DAYS = 3650;

export function clampOrderArchiveRetentionDays(
  raw: number | null | undefined,
): number {
  if (!Number.isFinite(raw)) return DEFAULT_ORDER_ARCHIVE_RETENTION_DAYS;
  const n = Math.round(Number(raw));
  if (n < MIN_ORDER_ARCHIVE_RETENTION_DAYS) return MIN_ORDER_ARCHIVE_RETENTION_DAYS;
  if (n > MAX_ORDER_ARCHIVE_RETENTION_DAYS) return MAX_ORDER_ARCHIVE_RETENTION_DAYS;
  return n;
}
