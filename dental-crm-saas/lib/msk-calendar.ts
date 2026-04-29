/** Календарь и рабочие дни в часовом поясе Europe/Moscow (без праздников РФ). */

const TZ = "Europe/Moscow";

/** YYYY-MM-DD по календарю Москвы для момента времени `d` (UTC). */
export function formatYmdInMsk(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function getMskHour(d: Date): number {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "numeric",
    hour12: false,
  }).formatToParts(d);
  const h = p.find((x) => x.type === "hour")?.value;
  return Number(h ?? "NaN");
}

/** Пн–пт по календарной дате в Москве (строка YYYY-MM-DD). */
export function isMskWeekdayYmd(ymd: string): boolean {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return false;
  const t = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(t);
  return wd !== "Sat" && wd !== "Sun";
}

/** Число дней в месяце (1-based month), по григорианскому календарю. */
export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/** Сдвиг календарной даты (по UTC-слоту полдня, затем чтение обратно в МСК). */
export function addCalendarDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const ud = new Date(Date.UTC(y, m - 1, d + delta, 12, 0, 0, 0));
  return formatYmdInMsk(ud);
}

/** Последний рабочий день месяца в Москве, не позже `dayCap` (1–31). */
export function lastWorkingDayOnOrBeforeMsk(
  year: number,
  month1: number,
  dayCap: number,
): string {
  const dim = daysInMonth(year, month1);
  let d = Math.min(Math.max(1, dayCap), dim);
  for (let i = 0; i < 14; i++) {
    const ymd = `${year}-${String(month1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (isMskWeekdayYmd(ymd)) return ymd;
    d -= 1;
    if (d < 1) break;
  }
  return `${year}-${String(month1).padStart(2, "0")}-01`;
}

/** Первый рабочий день месяца (МСК). */
export function firstWorkingDayOfMskMonth(year: number, month1: number): string {
  const dim = daysInMonth(year, month1);
  for (let d = 1; d <= dim; d++) {
    const ymd = `${year}-${String(month1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (isMskWeekdayYmd(ymd)) return ymd;
  }
  return `${year}-${String(month1).padStart(2, "0")}-01`;
}

/** Последний рабочий день месяца (МСК). */
export function lastWorkingDayOfMskMonth(year: number, month1: number): string {
  return lastWorkingDayOnOrBeforeMsk(year, month1, 31);
}

/** Первый рабочий день строго после `ymd` (МСК). */
export function firstWorkingDayStrictlyAfterYmd(ymd: string): string {
  let cur = addCalendarDaysYmd(ymd, 1);
  for (let i = 0; i < 14; i++) {
    if (isMskWeekdayYmd(cur)) return cur;
    cur = addCalendarDaysYmd(cur, 1);
  }
  return cur;
}

/** Дд.мм.гггг из YYYY-MM-DD. */
export function formatRuDateFromYmd(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export function formatReconciliationPeriodLabelRu(
  fromStr: string,
  toStr: string,
): string {
  return `${formatRuDateFromYmd(fromStr)}–${formatRuDateFromYmd(toStr)}`;
}
