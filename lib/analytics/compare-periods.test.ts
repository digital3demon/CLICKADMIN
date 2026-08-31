import { describe, expect, it } from "vitest";
import {
  deltaPercent,
  formatPeriodLabelRu,
  formatYmdRu,
  prevCalendarMonth,
  shiftYmdRangeBack,
} from "@/lib/analytics/compare-periods";

describe("formatPeriodLabelRu", () => {
  it("один год: 01.08–31.08.2026 для сверки клиники «Север»", () => {
    expect(formatPeriodLabelRu("2026-08-01", "2026-08-31")).toBe(
      "01.08–31.08.2026",
    );
  });

  it("кириллица вокруг даты не нужна в форматтере — день.месяц.год", () => {
    expect(formatYmdRu("2026-02-10")).toBe("10.02.2026");
  });

  it("разные годы — полное тире", () => {
    expect(formatPeriodLabelRu("2025-12-15", "2026-01-14")).toBe(
      "15.12.2025 – 14.01.2026",
    );
  });
});

describe("shiftYmdRangeBack", () => {
  it("август → июль той же длины", () => {
    expect(shiftYmdRangeBack("2026-08-01", "2026-08-31")).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
    });
  });
});

describe("prevCalendarMonth / deltaPercent", () => {
  it("январь → декабрь прошлого года", () => {
    expect(prevCalendarMonth(2026, 1)).toEqual({ year: 2025, month: 12 });
  });

  it("рост и падение в процентах", () => {
    expect(deltaPercent(120, 100)).toBe(20);
    expect(deltaPercent(80, 100)).toBe(-20);
    expect(deltaPercent(0, 0)).toBe(0);
    expect(deltaPercent(10, 0)).toBeNull();
  });
});
