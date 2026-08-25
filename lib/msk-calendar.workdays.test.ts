import { describe, expect, it } from "vitest";
import {
  addMskWorkingDaysAfterYmd,
  subtractMskWorkingDaysBeforeYmd,
} from "@/lib/msk-calendar";

describe("msk working days", () => {
  it("пятница + 1 рабочий день → понедельник", () => {
    expect(addMskWorkingDaysAfterYmd("2026-08-21", 1)).toBe("2026-08-24");
  });

  it("среда минус 1 рабочий день → вторник", () => {
    expect(subtractMskWorkingDaysBeforeYmd("2026-08-26", 1)).toBe("2026-08-25");
  });

  it("понедельник минус 1 рабочий день → пятница", () => {
    expect(subtractMskWorkingDaysBeforeYmd("2026-08-24", 1)).toBe("2026-08-21");
  });
});
