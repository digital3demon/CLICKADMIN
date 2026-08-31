/**
 * Календарные периоды сверки (МСК), без рабочих дней в границах слота.
 * 1–15 и 16–последний день месяца включительно.
 */
import type { ReconciliationFrequency, ReconciliationSnapshotSlot } from "@prisma/client";
import {
  addCalendarDaysYmd,
  daysInMonth,
  lastWorkingDayOnOrBeforeMsk,
} from "@/lib/msk-calendar";

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export type ReconCalendarSlot = ReconciliationSnapshotSlot;

export type ReconCalendarPeriod = {
  slot: ReconCalendarSlot;
  periodFromStr: string;
  periodToStr: string;
};

export type LockedReconPeriod = {
  periodFromStr: string;
  periodToStr: string;
};

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const m = YMD.exec(ymd.trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function lastCalendarDayOfMonthYmd(year: number, month1: number): string {
  const dim = daysInMonth(year, month1);
  return `${year}-${String(month1).padStart(2, "0")}-${String(dim).padStart(2, "0")}`;
}

export function firstCalendarDayOfMonthYmd(year: number, month1: number): string {
  return `${year}-${String(month1).padStart(2, "0")}-01`;
}

export function midMonthYmd(year: number, month1: number): string {
  return `${year}-${String(month1).padStart(2, "0")}-15`;
}

export function sixteenthYmd(year: number, month1: number): string {
  return `${year}-${String(month1).padStart(2, "0")}-16`;
}

/** Стандартный слот, в который попадает дата (по частоте клиники). */
export function standardPeriodContainingYmd(
  ymd: string,
  frequency: ReconciliationFrequency,
): ReconCalendarPeriod | null {
  const p = parseYmd(ymd);
  if (!p) return null;
  const { y, m, d } = p;
  const monthStart = firstCalendarDayOfMonthYmd(y, m);
  const monthEnd = lastCalendarDayOfMonthYmd(y, m);
  if (frequency === "MONTHLY_1") {
    return {
      slot: "MONTHLY_FULL",
      periodFromStr: monthStart,
      periodToStr: monthEnd,
    };
  }
  if (d <= 15) {
    return {
      slot: "FIRST_HALF",
      periodFromStr: monthStart,
      periodToStr: midMonthYmd(y, m),
    };
  }
  return {
    slot: "SECOND_HALF",
    periodFromStr: sixteenthYmd(y, m),
    periodToStr: monthEnd,
  };
}

/** Период, который начинается в `startYmd` (возможно укороченный после lock). */
export function periodStartingOnYmd(
  startYmd: string,
  frequency: ReconciliationFrequency,
): ReconCalendarPeriod | null {
  const std = standardPeriodContainingYmd(startYmd, frequency);
  if (!std) return null;
  if (startYmd > std.periodToStr) {
    const next = addCalendarDaysYmd(std.periodToStr, 1);
    return periodStartingOnYmd(next, frequency);
  }
  return {
    slot: std.slot,
    periodFromStr: startYmd > std.periodFromStr ? startYmd : std.periodFromStr,
    periodToStr: std.periodToStr,
  };
}

function maxYmd(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return dates.reduce((a, b) => (a >= b ? a : b));
}

/**
 * Открытое окно накопления на сегодня.
 * Зафиксированный период (галочка) обрезает текущий слот; переход 15→16
 * не открывает снова 1–15, если этот слот уже сохранён.
 */
export function currentAccumulatingPeriod(
  todayYmd: string,
  frequency: ReconciliationFrequency,
  locked: LockedReconPeriod[],
): ReconCalendarPeriod | null {
  const std = standardPeriodContainingYmd(todayYmd, frequency);
  if (!std) return null;

  const overlapping = locked.filter(
    (l) =>
      l.periodFromStr <= std.periodToStr && l.periodToStr >= std.periodFromStr,
  );
  const coverToday = locked.filter(
    (l) => l.periodFromStr <= todayYmd && l.periodToStr >= todayYmd,
  );

  if (coverToday.length > 0) {
    const maxTo = maxYmd(coverToday.map((l) => l.periodToStr));
    if (!maxTo) return std;
    const start = addCalendarDaysYmd(maxTo, 1);
    return periodStartingOnYmd(start, frequency);
  }

  if (overlapping.length > 0) {
    const maxTo = maxYmd(overlapping.map((l) => l.periodToStr));
    if (maxTo && maxTo >= std.periodFromStr && maxTo < std.periodToStr) {
      const start = addCalendarDaysYmd(maxTo, 1);
      if (start <= std.periodToStr) {
        return {
          slot: std.slot,
          periodFromStr: start,
          periodToStr: std.periodToStr,
        };
      }
    }
    if (maxTo && maxTo >= std.periodToStr) {
      const start = addCalendarDaysYmd(maxTo, 1);
      return periodStartingOnYmd(start, frequency);
    }
  }

  return std;
}

/** Ближайший рабочий день МСК не позже конца периода. */
export function highlightYmdForPeriodTo(periodToYmd: string): string | null {
  const p = parseYmd(periodToYmd);
  if (!p) return null;
  return lastWorkingDayOnOrBeforeMsk(p.y, p.m, p.d);
}

export function isPeriodHighlighted(
  todayYmd: string,
  periodToYmd: string,
): boolean {
  const h = highlightYmdForPeriodTo(periodToYmd);
  return h != null && h === todayYmd;
}

/**
 * Слот для ручного «с»/«по»: половина месяца или весь месяц, если границы
 * лежат в разных половинах одного месяца.
 */
export function slotForYmdRange(
  fromYmd: string,
  toYmd: string,
): ReconCalendarSlot {
  const start = standardPeriodContainingYmd(fromYmd, "MONTHLY_2");
  const end = standardPeriodContainingYmd(toYmd, "MONTHLY_2");
  if (
    start &&
    end &&
    start.slot === "FIRST_HALF" &&
    end.slot === "SECOND_HALF" &&
    start.periodFromStr.slice(0, 7) === end.periodFromStr.slice(0, 7)
  ) {
    return "MONTHLY_FULL";
  }
  return start?.slot ?? end?.slot ?? "MONTHLY_FULL";
}

export function frequencyLabelRu(
  frequency: ReconciliationFrequency,
  mixed?: boolean,
): string {
  if (mixed) return "2 раза в мес (частота разная)";
  return frequency === "MONTHLY_1" ? "1 раз в мес" : "2 раза в мес";
}
