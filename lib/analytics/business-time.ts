import { addCalendarDaysYmd, formatYmdInMsk } from "@/lib/msk-calendar";
import {
  addWorkingDaysAfterYmdWithOptions,
  isWorkingDayYmdWithOptions,
  type WorkingDayOptions,
} from "@/lib/production-calendar";
import type { DeadlinesScheduleConfig } from "@/lib/analytics/deadlines-schedule";
import { scheduleToWorkingDayOptions } from "@/lib/analytics/deadlines-schedule";

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

export type DeadlineBucket = "early" | "onTime" | "late";

function parseYmdParts(ymd: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) {
    return null;
  }
  return { y, m: mo, d };
}

function parseHm(hm: string): { h: number; min: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, min };
}

/** Локальное время МСК → UTC Date (как в analytics/range). */
export function mskLocalDateTimeToUtc(ymd: string, hm: string): Date | null {
  const parts = parseYmdParts(ymd);
  const time = parseHm(hm);
  if (!parts || !time) return null;
  return new Date(
    Date.UTC(parts.y, parts.m - 1, parts.d, time.h, time.min, 0, 0) - MSK_OFFSET_MS,
  );
}

function workingDayOptions(schedule: DeadlinesScheduleConfig): WorkingDayOptions {
  return scheduleToWorkingDayOptions(schedule);
}

export function countWorkingMinutesBetween(
  start: Date,
  end: Date,
  schedule: DeadlinesScheduleConfig,
): number {
  if (end.getTime() <= start.getTime()) return 0;
  const opts = workingDayOptions(schedule);
  let total = 0;
  let curYmd = formatYmdInMsk(start);
  const endYmd = formatYmdInMsk(end);
  for (let guard = 0; guard < 5000; guard++) {
    if (isWorkingDayYmdWithOptions(curYmd, opts)) {
      const dayStart = mskLocalDateTimeToUtc(curYmd, schedule.workStartHm);
      const dayEnd = mskLocalDateTimeToUtc(curYmd, schedule.workEndHm);
      if (dayStart && dayEnd) {
        const windowStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
        const windowEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));
        if (windowEnd.getTime() > windowStart.getTime()) {
          total += Math.floor(
            (windowEnd.getTime() - windowStart.getTime()) / 60_000,
          );
        }
      }
    }
    if (curYmd >= endYmd) break;
    curYmd = addCalendarDaysYmd(curYmd, 1);
  }
  return total;
}

export function workDeadlineEndAt(
  createdAt: Date,
  leadWorkingDays: number,
  schedule: DeadlinesScheduleConfig,
): Date | null {
  const opts = workingDayOptions(schedule);
  const startYmd = formatYmdInMsk(createdAt);
  const lead = Math.max(0, Math.trunc(leadWorkingDays));
  const deadlineYmd =
    lead === 0
      ? startYmd
      : addWorkingDaysAfterYmdWithOptions(startYmd, lead, opts);
  return mskLocalDateTimeToUtc(deadlineYmd, schedule.workEndHm);
}

export function classifyWithToleranceMinutes(
  actualMinutes: number,
  targetMinutes: number,
  toleranceMinutes: number,
): DeadlineBucket {
  const low = targetMinutes - toleranceMinutes;
  const high = targetMinutes + toleranceMinutes;
  if (actualMinutes < low) return "early";
  if (actualMinutes <= high) return "onTime";
  return "late";
}

export function classifyInstantWithTolerance(
  actualAt: Date,
  targetAt: Date,
  toleranceMinutes: number,
): DeadlineBucket {
  const tolMs = toleranceMinutes * 60_000;
  const t = targetAt.getTime();
  const a = actualAt.getTime();
  if (a < t - tolMs) return "early";
  if (a <= t + tolMs) return "onTime";
  return "late";
}

export function averageMinutes(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round(sum / values.length);
}
