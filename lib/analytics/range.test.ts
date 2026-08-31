import { describe, it, expect } from "vitest";
import {
  analyticsBusinessDayKey,
  analyticsMonthBounds,
  currentMskMonthYmdRange,
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

  it("parses inclusive day bounds in MSK business time", () => {
    const sp = new URLSearchParams({ from: "2024-06-10", to: "2024-06-12" });
    const r = parseAnalyticsRange(sp);
    if ("error" in r) throw new Error(r.error);
    expect(r.from.toISOString()).toBe("2024-06-09T21:00:00.000Z");
    expect(r.to.toISOString()).toBe("2024-06-12T20:59:59.999Z");
  });
});

describe("toYmd", () => {
  it("formats as YYYY-MM-DD in MSK business date", () => {
    expect(toYmd(new Date("2024-03-04T21:30:00.000Z"))).toBe("2024-03-05");
  });
});

describe("analyticsBusinessDayKey", () => {
  it("groups late UTC evening into next MSK day", () => {
    expect(analyticsBusinessDayKey(new Date("2024-06-10T21:15:00.000Z"))).toBe(
      "2024-06-11",
    );
  });
});

describe("analyticsMonthBounds", () => {
  it("returns MSK month bounds in UTC instants", () => {
    const bounds = analyticsMonthBounds(2024, 6);
    expect(bounds.from.toISOString()).toBe("2024-05-31T21:00:00.000Z");
    expect(bounds.toExclusive.toISOString()).toBe("2024-06-30T21:00:00.000Z");
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

describe("currentMskMonthYmdRange", () => {
  it("август 2026 по MSK: с 01 по 31", () => {
    const r = currentMskMonthYmdRange(new Date("2026-08-15T12:00:00.000Z"));
    expect(r.from).toBe("2026-08-01");
    expect(r.to).toBe("2026-08-31");
  });
});
