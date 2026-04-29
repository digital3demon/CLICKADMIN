import { describe, it, expect } from "vitest";
import {
  parseAnalyticsRange,
  toYmd,
  defaultAnalyticsRange,
} from "@/lib/analytics/range";

describe("parseAnalyticsRange", () => {
  it("returns error when params missing", () => {
    const sp = new URLSearchParams();
    expect(parseAnalyticsRange(sp)).toEqual({
      error: "Укажите параметры from и to (YYYY-MM-DD)",
    });
  });

  it("returns error on invalid date", () => {
    const sp = new URLSearchParams({ from: "2024-01-01", to: "not-a-date" });
    expect(parseAnalyticsRange(sp)).toEqual({ error: "Неверный формат даты" });
  });

  it("returns error when from > to", () => {
    const sp = new URLSearchParams({ from: "2024-02-01", to: "2024-01-01" });
    expect(parseAnalyticsRange(sp)).toEqual({
      error: "Дата «с» позже даты «по»",
    });
  });

  it("parses inclusive day bounds in local midnight", () => {
    const sp = new URLSearchParams({ from: "2024-06-10", to: "2024-06-12" });
    const r = parseAnalyticsRange(sp);
    if ("error" in r) throw new Error(r.error);
    expect(r.from.getFullYear()).toBe(2024);
    expect(r.from.getMonth()).toBe(5);
    expect(r.from.getDate()).toBe(10);
    expect(r.to.getHours()).toBe(23);
    expect(r.to.getMinutes()).toBe(59);
    expect(r.to.getFullYear()).toBe(2024);
    expect(r.to.getMonth()).toBe(5);
    expect(r.to.getDate()).toBe(12);
  });
});

describe("toYmd", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(toYmd(new Date(2024, 2, 5))).toBe("2024-03-05");
  });
});

describe("defaultAnalyticsRange", () => {
  it("returns 30-day window with from <= to", () => {
    const { from, to } = defaultAnalyticsRange();
    expect(from.getTime()).toBeLessThanOrEqual(to.getTime());
    const spanMs = to.getTime() - from.getTime();
    expect(spanMs).toBeGreaterThan(0);
    expect(spanMs).toBeLessThanOrEqual(31 * 24 * 60 * 60 * 1000);
  });
});
