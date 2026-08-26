import { addCalendarDaysYmd, formatYmdInMsk } from "@/lib/msk-calendar";

/** Следующая полночь Europe/Moscow (мс UTC). */
export function nextMskMidnightUtcMs(nowMs: number = Date.now()): number {
  const ymd = formatYmdInMsk(new Date(nowMs));
  const todayStart = Date.parse(`${ymd}T00:00:00+03:00`);
  if (Number.isFinite(todayStart) && nowMs < todayStart) return todayStart;
  const nextYmd = addCalendarDaysYmd(ymd, 1);
  return Date.parse(`${nextYmd}T00:00:00+03:00`);
}

export function msUntilNextMskMidnight(nowMs: number = Date.now()): number {
  const next = nextMskMidnightUtcMs(nowMs);
  if (!Number.isFinite(next)) return 60_000;
  return Math.max(1_000, next - nowMs);
}

const MSK_DAY_MS = 24 * 60 * 60 * 1000;

/** Сколько прошло с последней полуночи МСК (для догона после рестарта). */
export function msSinceLastMskMidnight(nowMs: number = Date.now()): number {
  return Math.max(0, MSK_DAY_MS - msUntilNextMskMidnight(nowMs));
}

export const CRM_BACKUP_CATCH_UP_AFTER_MIDNIGHT_MS = 20 * 60 * 1000;

export function isWithinCrmBackupCatchUpWindow(
  nowMs: number = Date.now(),
): boolean {
  return msSinceLastMskMidnight(nowMs) < CRM_BACKUP_CATCH_UP_AFTER_MIDNIGHT_MS;
}
