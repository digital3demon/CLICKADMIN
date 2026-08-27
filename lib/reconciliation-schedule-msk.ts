import type { ReconciliationFrequency } from "@prisma/client";

export type ReconciliationCronTask = {
  slot: "MONTHLY_FULL" | "FIRST_HALF" | "SECOND_HALF";
  periodFromStr: string;
  periodToStr: string;
  periodLabelRu: string;
};

/**
 * Автоснимки по cron больше не создаём: сверка копится живьём,
 * файл собирается в момент «Скачать сверку».
 */
export function reconciliationCronTasksForNow(
  _nowUtc: Date,
  _frequency: ReconciliationFrequency,
): ReconciliationCronTask[] {
  return [];
}
