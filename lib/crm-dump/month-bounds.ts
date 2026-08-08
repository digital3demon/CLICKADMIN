/**
 * Границы календарного месяца в локальной таймзоне сервера.
 * monthKey: YYYY-MM
 */

export type MonthBounds = {
  monthKey: string;
  fromInclusive: Date;
  toExclusive: Date;
};

export function parseMonthKey(raw: string): MonthBounds | null {
  const m = /^(\d{4})-(\d{2})$/.exec(String(raw || "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12) return null;
  const fromInclusive = new Date(y, mo - 1, 1, 0, 0, 0, 0);
  const toExclusive = new Date(y, mo, 1, 0, 0, 0, 0);
  if (
    fromInclusive.getFullYear() !== y ||
    fromInclusive.getMonth() !== mo - 1
  ) {
    return null;
  }
  return {
    monthKey: `${y}-${String(mo).padStart(2, "0")}`,
    fromInclusive,
    toExclusive,
  };
}

/** Дефолт для UI: предыдущий полный календарный месяц. */
export function defaultDumpMonthKey(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
