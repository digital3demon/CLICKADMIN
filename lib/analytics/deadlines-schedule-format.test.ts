import { describe, expect, it } from "vitest";
import {
  formatDurationDaysHoursRu,
  workDayDurationMinutes,
} from "@/lib/analytics/deadlines-schedule";

const TEN_HOUR_DAY = 600;

describe("formatDurationDaysHoursRu", () => {
  it("показывает рабочие дни и часы", () => {
    expect(formatDurationDaysHoursRu(5978, TEN_HOUR_DAY)).toBe("9 дн. 9 ч");
    expect(formatDurationDaysHoursRu(3540, TEN_HOUR_DAY)).toBe("5 дн. 9 ч");
  });

  it("меньше рабочего дня — часы и минуты", () => {
    expect(formatDurationDaysHoursRu(59, TEN_HOUR_DAY)).toBe("59 мин");
    expect(formatDurationDaysHoursRu(125, TEN_HOUR_DAY)).toBe("2 ч 5 мин");
  });

  it("только целые дни без остатка часов", () => {
    expect(formatDurationDaysHoursRu(2400, TEN_HOUR_DAY)).toBe("4 дн.");
  });
});

describe("workDayDurationMinutes", () => {
  it("считает длину дня из расписания", () => {
    expect(
      workDayDurationMinutes({ workStartHm: "09:00", workEndHm: "19:00" }),
    ).toBe(600);
  });
});
