import { describe, expect, it } from "vitest";
import {
  addWorkingDaysAfterYmd,
  isWorkingDayYmd,
  normalizeProductionCalendarCountry,
} from "@/lib/production-calendar";

describe("production-calendar", () => {
  it("normalizes unknown country to RU", () => {
    expect(normalizeProductionCalendarCountry("xx")).toBe("RU");
  });

  it("treats weekend as non-working day", () => {
    expect(isWorkingDayYmd("2026-05-02", "RU")).toBe(false);
  });

  it("treats 9 May as holiday for RU", () => {
    expect(isWorkingDayYmd("2026-05-09", "RU")).toBe(false);
  });

  it("adds one working day from Thursday", () => {
    expect(addWorkingDaysAfterYmd("2026-04-02", 1, "RU")).toBe("2026-04-03");
  });

  it("skips weekend when adding one working day from Friday", () => {
    expect(addWorkingDaysAfterYmd("2026-04-03", 1, "RU")).toBe("2026-04-06");
  });
});
