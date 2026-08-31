/**
 * Контракт дат аналитики: рабочий день лаборатории считается по MSK (UTC+3),
 * независимо от timezone сервера. В БД храним Date/UTC, UI передаёт YYYY-MM-DD.
 */
const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

function parseYmdParts(s: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return { y, m, d };
}

function mskDateTimeUtc(
  parts: { y: number; m: number; d: number },
  h: number,
  min: number,
  sec: number,
  ms: number,
): Date {
  return new Date(
    Date.UTC(parts.y, parts.m - 1, parts.d, h, min, sec, ms) - MSK_OFFSET_MS,
  );
}

export function analyticsBusinessDayKey(d: Date): string {
  return new Date(d.getTime() + MSK_OFFSET_MS).toISOString().slice(0, 10);
}

export function analyticsMonthBounds(year: number, month: number): {
  from: Date;
  toExclusive: Date;
} {
  const from = new Date(Date.UTC(year, month - 1, 1) - MSK_OFFSET_MS);
  const toExclusive = new Date(Date.UTC(year, month, 1) - MSK_OFFSET_MS);
  return { from, toExclusive };
}

export function analyticsYmdRange(
  fromStr: string,
  toStr: string,
): { from: Date; to: Date } | null {
  const fromParts = parseYmdParts(fromStr);
  const toParts = parseYmdParts(toStr);
  if (!fromParts || !toParts) return null;
  const from = mskDateTimeUtc(fromParts, 0, 0, 0, 0);
  const to = mskDateTimeUtc(toParts, 23, 59, 59, 999);
  return { from, to };
}

/** Парсинг периода для отчётов: `from` / `to` в формате ISO date (YYYY-MM-DD). */
export function parseAnalyticsRange(sp: URLSearchParams): {
  from: Date;
  to: Date;
} | { error: string } {
  const fromStr = sp.get("from")?.trim();
  const toStr = sp.get("to")?.trim();
  if (!fromStr || !toStr) {
    return { error: "Укажите параметры from и to (YYYY-MM-DD)" };
  }
  const range = analyticsYmdRange(fromStr, toStr);
  if (!range) {
    return { error: "Неверный формат даты" };
  }
  if (range.from > range.to) {
    return { error: "Дата «с» позже даты «по»" };
  }
  return range;
}

export function defaultAnalyticsRange(): { from: Date; to: Date } {
  const to = new Date();
  const toKey = analyticsBusinessDayKey(to);
  const toParts = parseYmdParts(toKey)!;
  const fromUtcMs = Date.UTC(toParts.y, toParts.m - 1, toParts.d) - 29 * 24 * 60 * 60 * 1000;
  const fromKey = new Date(fromUtcMs).toISOString().slice(0, 10);
  const range = analyticsYmdRange(fromKey, toKey);
  return range ?? { from: to, to };
}

export function toYmd(d: Date): string {
  return analyticsBusinessDayKey(d);
}

/** Календарный месяц «сегодня» по MSK: с 1-го по последний день месяца. */
export function currentMskMonthYmdRange(now = new Date()): {
  from: string;
  to: string;
} {
  const today = analyticsBusinessDayKey(now);
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const { from, toExclusive } = analyticsMonthBounds(y, m);
  const last = new Date(toExclusive.getTime() - 1);
  return { from: toYmd(from), to: toYmd(last) };
}
