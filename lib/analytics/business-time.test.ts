import { describe, expect, it } from "vitest";
import {
  classifyInstantWithTolerance,
  classifyWithToleranceMinutes,
  countWorkingMinutesBetween,
  mskLocalDateTimeToUtc,
  workDeadlineEndAt,
} from "@/lib/analytics/business-time";
import { defaultDeadlinesSchedule } from "@/lib/analytics/deadlines-schedule";

describe("countWorkingMinutesBetween", () => {
  it("counts only within 9-19 MSK on a weekday", () => {
    const schedule = defaultDeadlinesSchedule();
    const start = mskLocalDateTimeToUtc("2026-06-01", "10:00")!;
    const end = mskLocalDateTimeToUtc("2026-06-01", "12:00")!;
    expect(countWorkingMinutesBetween(start, end, schedule)).toBe(120);
  });

  it("skips Sunday when only Sunday is weekend", () => {
    const schedule = defaultDeadlinesSchedule();
    const start = mskLocalDateTimeToUtc("2026-06-07", "10:00")!;
    const end = mskLocalDateTimeToUtc("2026-06-08", "12:00")!;
    expect(countWorkingMinutesBetween(start, end, schedule)).toBe(180);
  });
});

describe("classifyWithToleranceMinutes", () => {
  it("splits admin buckets with 30 min tolerance", () => {
    expect(classifyWithToleranceMinutes(240, 300, 30)).toBe("early");
    expect(classifyWithToleranceMinutes(300, 300, 30)).toBe("onTime");
    expect(classifyWithToleranceMinutes(331, 300, 30)).toBe("late");
  });
});

describe("classifyInstantWithTolerance", () => {
  it("classifies work handoff vs deadline", () => {
    const deadline = mskLocalDateTimeToUtc("2026-06-05", "19:00")!;
    const early = new Date(deadline.getTime() - 60 * 60_000);
    const onTime = new Date(deadline.getTime() + 15 * 60_000);
    const late = new Date(deadline.getTime() + 45 * 60_000);
    expect(classifyInstantWithTolerance(early, deadline, 30)).toBe("early");
    expect(classifyInstantWithTolerance(onTime, deadline, 30)).toBe("onTime");
    expect(classifyInstantWithTolerance(late, deadline, 30)).toBe("late");
  });
});

describe("workDeadlineEndAt", () => {
  it("returns end of same day for lead 0", () => {
    const schedule = defaultDeadlinesSchedule();
    const created = mskLocalDateTimeToUtc("2026-06-01", "11:00")!;
    const end = workDeadlineEndAt(created, 0, schedule);
    expect(end?.toISOString()).toBe(mskLocalDateTimeToUtc("2026-06-01", "19:00")!.toISOString());
  });
});
