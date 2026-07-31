/**
 * Календарные даты для отгрузок по Europe/Moscow (МСК, UTC+3).
 * Отбор нарядов: по полю dueDate (срок лаборатории), не по дате приёма пациента.
 *
 * Окно «отгрузки на день D»: [D 00:00 МСК, (D+1) 12:00 МСК) — сроки с D
 * плюс первые полсуток следующего календарного дня.
 */

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Сегодняшняя дата по календарю Москвы в формате YYYY-MM-DD. */
export function moscowTodayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Следующий календарный день после ymd (Gregorian, компоненты даты). */
export function addCalendarDaysYmd(ymd: string, delta: number): string {
  const m = YMD_RE.exec(ymd.trim());
  if (!m) throw new Error(`INVALID_YMD: ${ymd}`);
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const dt = new Date(Date.UTC(y, mo - 1, d + delta));
  const y2 = dt.getUTCFullYear();
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d2 = String(dt.getUTCDate()).padStart(2, "0");
  return `${y2}-${m2}-${d2}`;
}

export function moscowTomorrowYmd(): string {
  return addCalendarDaysYmd(moscowTodayYmd(), 1);
}

/** Проверка строки YYYY-MM-DD. */
export function parseYmdOrNull(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null;
  const s = String(raw).trim();
  if (!YMD_RE.test(s)) return null;
  const m = YMD_RE.exec(s)!;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return s;
}

/**
 * [start, endExclusive) в UTC для суток ymd по Москве (00:00–24:00 МСК).
 */
export function moscowDayBoundsUtc(ymd: string): { start: Date; endExclusive: Date } {
  const next = addCalendarDaysYmd(ymd, 1);
  return {
    start: new Date(`${ymd}T00:00:00+03:00`),
    endExclusive: new Date(`${next}T00:00:00+03:00`),
  };
}

/** Диапазон [from, to] включительно по календарным дням Москвы. */
export function moscowInclusiveRangeBoundsUtc(
  fromYmd: string,
  toYmd: string,
): { start: Date; endExclusive: Date } {
  const { start } = moscowDayBoundsUtc(fromYmd);
  const { endExclusive } = moscowDayBoundsUtc(toYmd);
  return { start, endExclusive };
}

/**
 * Окно отгрузки на календарный день ymd (МСК):
 * [ymd 00:00, (ymd+1) 12:00) — включая первую половину следующего календарного дня.
 */
export function moscowShipmentDayBoundsUtc(
  ymd: string,
): { start: Date; endExclusive: Date } {
  const next = addCalendarDaysYmd(ymd, 1);
  return {
    start: new Date(`${ymd}T00:00:00+03:00`),
    endExclusive: new Date(`${next}T12:00:00+03:00`),
  };
}

/**
 * Объединённое окно для вкладки «За период»: от 00:00 fromYmd до 12:00 дня после toYmd (МСК), [start, endExclusive).
 */
export function moscowShipmentInclusiveRangeBoundsUtc(
  fromYmd: string,
  toYmd: string,
): { start: Date; endExclusive: Date } {
  const { start } = moscowShipmentDayBoundsUtc(fromYmd);
  const dayAfterTo = addCalendarDaysYmd(toYmd, 1);
  const endExclusive = new Date(`${dayAfterTo}T12:00:00+03:00`);
  return { start, endExclusive };
}

/** Пн–Вс в Москве для календарной даты ymd (полдень МСК для стабильности). */
export function moscowWeekdayMon1Sun7(ymd: string): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow",
    weekday: "short",
  }).format(new Date(`${ymd}T12:00:00+03:00`));
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[wd] ?? 1;
}

/** Рабочий день МСК: пн–пт. */
export function isMoscowWorkingDayYmd(ymd: string): boolean {
  return moscowWeekdayMon1Sun7(ymd) <= 5;
}

/**
 * Дата через `n` рабочих дней после `fromYmd` (пн–пт).
 * Пример: пн + 2 → ср; пт + 2 → вт следующей недели.
 */
export function addMoscowWorkingDaysYmd(fromYmd: string, n: number): string {
  if (!Number.isFinite(n) || n <= 0) return fromYmd;
  let ymd = fromYmd;
  let added = 0;
  while (added < n) {
    ymd = addCalendarDaysYmd(ymd, 1);
    if (isMoscowWorkingDayYmd(ymd)) added += 1;
  }
  return ymd;
}

/**
 * Окно «Актуальное» для даты записи: с fromYmd по fromYmd+2 рабочих дня включительно
 * (выходные между ними входят в календарный диапазон).
 * Пн → пн–ср; пт → пт–вт (включая сб–вс).
 */
export function moscowActualAppointmentWindowYmd(fromYmd: string): {
  startYmd: string;
  endYmd: string;
} {
  return {
    startYmd: fromYmd,
    endYmd: addMoscowWorkingDaysYmd(fromYmd, 2),
  };
}

/**
 * Пятница «рабочей недели» для отгрузок до конца недели:
 * пн–пт — пятница той же календарной недели; сб — ближайшая следующая пятница; вс — ближайшая следующая пятница.
 */
export function moscowWorkWeekFridayYmd(fromYmd: string): string {
  const idx = moscowWeekdayMon1Sun7(fromYmd);
  let delta = 0;
  if (idx <= 5) delta = 5 - idx;
  else if (idx === 6) delta = 6;
  else delta = 5;
  return addCalendarDaysYmd(fromYmd, delta);
}
