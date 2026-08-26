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
