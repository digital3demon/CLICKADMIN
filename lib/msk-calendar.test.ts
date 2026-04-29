import { describe, expect, it } from "vitest";
import {
  firstWorkingDayOfMskMonth,
  formatYmdInMsk,
  isMskWeekdayYmd,
  lastWorkingDayOfMskMonth,
  lastWorkingDayOnOrBeforeMsk,
} from "@/lib/msk-calendar";

describe("msk-calendar", () => {
  it("last working day on or before 15 — March 2026 (15 is Sunday)", () => {
    expect(lastWorkingDayOnOrBeforeMsk(2026, 3, 15)).toBe("2026-03-13");
  });

  it("last working day on or before 15 — April 2026 (15 is Wednesday)", () => {
    expect(lastWorkingDayOnOrBeforeMsk(2026, 4, 15)).toBe("2026-04-15");
  });

  it("first working day of month — May 2026 starts Friday", () => {
    expect(firstWorkingDayOfMskMonth(2026, 5)).toBe("2026-05-01");
  });

  it("last working day of month — May 2026", () => {
    expect(lastWorkingDayOfMskMonth(2026, 5)).toBe("2026-05-29");
  });

  it("weekday check", () => {
    expect(isMskWeekdayYmd("2026-04-04")).toBe(false);
    expect(isMskWeekdayYmd("2026-04-06")).toBe(true);
  });

  it("formatYmdInMsk matches calendar in Moscow", () => {
    const d = new Date(Date.UTC(2026, 3, 4, 12, 0, 0, 0));
    expect(formatYmdInMsk(d)).toBe("2026-04-04");
  });
});
