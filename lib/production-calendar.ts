export const PRODUCTION_CALENDAR_COUNTRIES = ["RU", "BY", "KZ"] as const;

export type ProductionCalendarCountry =
  (typeof PRODUCTION_CALENDAR_COUNTRIES)[number];

export const DEFAULT_PRODUCTION_CALENDAR_COUNTRY: ProductionCalendarCountry = "RU";

const HOLIDAYS_MM_DD: Record<ProductionCalendarCountry, ReadonlySet<string>> = {
  RU: new Set([
    "01-01",
    "01-02",
    "01-03",
    "01-04",
    "01-05",
    "01-06",
    "01-07",
    "01-08",
    "02-23",
    "03-08",
    "05-01",
    "05-09",
    "06-12",
    "11-04",
  ]),
  BY: new Set([
    "01-01",
    "01-07",
    "03-08",
    "05-01",
    "05-09",
    "07-03",
    "11-07",
    "12-25",
  ]),
  KZ: new Set([
    "01-01",
    "01-02",
    "03-08",
    "03-21",
    "03-22",
    "03-23",
    "05-01",
    "05-07",
    "05-09",
    "07-06",
    "08-30",
    "10-25",
    "12-16",
  ]),
};

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) {
    return null;
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

export function normalizeProductionCalendarCountry(
  value: string | null | undefined,
): ProductionCalendarCountry {
  const v = String(value ?? "").trim().toUpperCase();
  if (
    PRODUCTION_CALENDAR_COUNTRIES.includes(v as ProductionCalendarCountry)
  ) {
    return v as ProductionCalendarCountry;
  }
  return DEFAULT_PRODUCTION_CALENDAR_COUNTRY;
}

export function isWeekendYmd(ymd: string): boolean {
  const p = parseYmd(ymd);
  if (!p) return false;
  const wd = new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0, 0)).getUTCDay();
  return wd === 0 || wd === 6;
}

export function isWorkingDayYmd(
  ymd: string,
  countryInput?: string | null,
): boolean {
  const p = parseYmd(ymd);
  if (!p) return false;
  if (isWeekendYmd(ymd)) return false;
  const country = normalizeProductionCalendarCountry(countryInput);
  const mmdd = `${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  return !HOLIDAYS_MM_DD[country].has(mmdd);
}

function addCalendarDaysYmd(ymd: string, days: number): string {
  const p = parseYmd(ymd);
  if (!p) return ymd;
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d + days, 12, 0, 0, 0));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

/**
 * Возвращает дату после добавления N рабочих дней, считая со следующего дня.
 * Пример: start=2026-04-01, days=1 => 2026-04-02 (если это рабочий день).
 */
export function addWorkingDaysAfterYmd(
  startYmd: string,
  days: number,
  countryInput?: string | null,
): string {
  const n = Math.max(0, Math.trunc(Number(days) || 0));
  if (n === 0) return startYmd;
  let cur = startYmd;
  let left = n;
  for (let i = 0; i < 4000; i++) {
    cur = addCalendarDaysYmd(cur, 1);
    if (isWorkingDayYmd(cur, countryInput)) {
      left -= 1;
      if (left <= 0) return cur;
    }
  }
  return cur;
}
