import { describe, expect, it } from "vitest";
import {
  isWithinCrmBackupCatchUpWindow,
  msUntilNextMskMidnight,
  nextMskMidnightUtcMs,
} from "./next-midnight-msk";

describe("nextMskMidnightUtcMs", () => {
  it("от дневного времени МСК до следующей полуночи, кириллица в дате не нужна", () => {
    const afternoon = Date.parse("2026-08-26T14:07:00+03:00");
    expect(nextMskMidnightUtcMs(afternoon)).toBe(
      Date.parse("2026-08-27T00:00:00+03:00"),
    );
    expect(msUntilNextMskMidnight(afternoon)).toBe(
      Date.parse("2026-08-27T00:00:00+03:00") - afternoon,
    );
  });

  it("если уже после полуночи — не сегодня 00:00", () => {
    const justAfter = Date.parse("2026-08-26T00:00:01+03:00");
    expect(nextMskMidnightUtcMs(justAfter)).toBe(
      Date.parse("2026-08-27T00:00:00+03:00"),
    );
    expect(isWithinCrmBackupCatchUpWindow(justAfter)).toBe(true);
  });

  it("догон только в первые 20 минут после полуночи МСК", () => {
    const noon = Date.parse("2026-08-26T12:00:00+03:00");
    expect(isWithinCrmBackupCatchUpWindow(noon)).toBe(false);
    const late = Date.parse("2026-08-26T00:21:00+03:00");
    expect(isWithinCrmBackupCatchUpWindow(late)).toBe(false);
  });
});
