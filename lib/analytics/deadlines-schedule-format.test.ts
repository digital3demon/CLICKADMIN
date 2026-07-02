import { describe, expect, it } from "vitest";
import {
  formatDurationDaysHoursRu,
  workDayDurationMinutes,
} from "@/lib/analytics/deadlines-schedule";

const TEN_HOUR_DAY = 600;

describe("formatDurationDaysHoursRu", () => {
  it("показывает рабочие дни и часы", () => {
    expect(formatDurationDaysHoursRu(5978, TEN_HOUR_DAY)).toBe("10 дн.");
    expect(formatDurationDaysHoursRu(3540, TEN_HOUR_DAY)).toBe("5 дн. 9 ч");
  });

  it("округляет минуты: <30 — в ноль, от 31 — +1 ч", () => {
    expect(formatDurationDaysHoursRu(125, TEN_HOUR_DAY)).toBe("2 ч");
    expect(formatDurationDaysHoursRu(91, TEN_HOUR_DAY)).toBe("2 ч");
    expect(formatDurationDaysHoursRu(59, TEN_HOUR_DAY)).toBe("1 ч");
    expect(formatDurationDaysHoursRu(2439, TEN_HOUR_DAY)).toBe("4 дн. 1 ч");
  });

  it("меньше часа без округления вверх", () => {
    expect(formatDurationDaysHoursRu(25, TEN_HOUR_DAY)).toBe("25 мин");
    expect(formatDurationDaysHoursRu(30, TEN_HOUR_DAY)).toBe("30 мин");
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
