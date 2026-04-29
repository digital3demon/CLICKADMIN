import type { ReconciliationFrequency } from "@prisma/client";
import {
  firstWorkingDayOfMskMonth,
  firstWorkingDayStrictlyAfterYmd,
  formatReconciliationPeriodLabelRu,
  formatYmdInMsk,
  getMskHour,
  isMskWeekdayYmd,
  lastWorkingDayOfMskMonth,
  lastWorkingDayOnOrBeforeMsk,
} from "@/lib/msk-calendar";

export type ReconciliationCronTask = {
  slot: "MONTHLY_FULL" | "FIRST_HALF" | "SECOND_HALF";
  periodFromStr: string;
  periodToStr: string;
  periodLabelRu: string;
};

function ymdParts(ymd: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(ymd.trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) };
}

/**
 * Задачи формирования сверки «на сегодня по МСК», если сегодня — нужный рабочий день и час ~20.
 * Вызывается из cron раз в сутки (рекомендуется 17:05 UTC = 20:05 МСК).
 */
export function reconciliationCronTasksForNow(
  nowUtc: Date,
  frequency: ReconciliationFrequency,
): ReconciliationCronTask[] {
  const todayMsk = formatYmdInMsk(nowUtc);
  const hour = getMskHour(nowUtc);
  if (hour < 20 || hour > 21) {
    return [];
  }
  if (!isMskWeekdayYmd(todayMsk)) {
    return [];
  }

  const parts = ymdParts(todayMsk);
  if (!parts) return [];
  const { y, m } = parts;

  const out: ReconciliationCronTask[] = [];

  const endMonth = lastWorkingDayOfMskMonth(y, m);

  if (frequency === "MONTHLY_2") {
    const endFirstHalf = lastWorkingDayOnOrBeforeMsk(y, m, 15);
    const startFirstHalf = firstWorkingDayOfMskMonth(y, m);
    if (todayMsk === endFirstHalf) {
      out.push({
        slot: "FIRST_HALF",
        periodFromStr: startFirstHalf,
        periodToStr: endFirstHalf,
        periodLabelRu: formatReconciliationPeriodLabelRu(
          startFirstHalf,
          endFirstHalf,
        ),
      });
    }
    if (todayMsk === endMonth) {
      const startSecond = firstWorkingDayStrictlyAfterYmd(endFirstHalf);
      if (startSecond <= endMonth) {
        out.push({
          slot: "SECOND_HALF",
          periodFromStr: startSecond,
          periodToStr: endMonth,
          periodLabelRu: formatReconciliationPeriodLabelRu(
            startSecond,
            endMonth,
          ),
        });
      }
    }
  }

  if (frequency === "MONTHLY_1" && todayMsk === endMonth) {
    const start = firstWorkingDayOfMskMonth(y, m);
    out.push({
      slot: "MONTHLY_FULL",
      periodFromStr: start,
      periodToStr: endMonth,
      periodLabelRu: formatReconciliationPeriodLabelRu(start, endMonth),
    });
  }

  return out;
}
