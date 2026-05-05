import {
  addCalendarDaysYmd,
} from "@/lib/shipments-date-range";
import {
  firstWorkingDayStrictlyAfterYmd,
  isMskWeekdayYmd,
} from "@/lib/msk-calendar";

/** Завтра или следующий рабочий день после выходных — верхняя граница периода для /dlinetm. */
export function endYmdKanbanDlinetm(todayYmd: string): string {
  const tomorrow = addCalendarDaysYmd(todayYmd, 1);
  if (isMskWeekdayYmd(tomorrow)) return tomorrow;
  return firstWorkingDayStrictlyAfterYmd(todayYmd);
}
