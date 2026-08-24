import { describe, expect, it } from "vitest";
import {
  addCalendarDaysYmd,
  addMoscowWorkingDaysYmd,
  moscowActualAppointmentWindowYmd,
  moscowWorkWeekFridayYmd,
} from "@/lib/shipments-date-range";

describe("moscowWorkWeekFridayYmd", () => {
  it("Wednesday → Friday same week", () => {
    expect(moscowWorkWeekFridayYmd("2026-05-06")).toBe("2026-05-08");
  });

  it("Friday → same Friday", () => {
    expect(moscowWorkWeekFridayYmd("2026-05-08")).toBe("2026-05-08");
  });

  it("Saturday → next Friday", () => {
    expect(moscowWorkWeekFridayYmd("2026-05-09")).toBe("2026-05-15");
  });

  it("Sunday → next Friday", () => {
    expect(moscowWorkWeekFridayYmd("2026-05-10")).toBe("2026-05-15");
  });
});

describe("addCalendarDaysYmd", () => {
  it("вчера через границу месяца", () => {
    expect(addCalendarDaysYmd("2026-08-01", -1)).toBe("2026-07-31");
  });
});

describe("addMoscowWorkingDaysYmd", () => {
  it("Monday + 2 → Wednesday", () => {
    expect(addMoscowWorkingDaysYmd("2026-07-27", 2)).toBe("2026-07-29");
  });

  it("Friday + 2 → next Tuesday", () => {
    expect(addMoscowWorkingDaysYmd("2026-07-31", 2)).toBe("2026-08-04");
  });
});

describe("moscowActualAppointmentWindowYmd", () => {
  it("Monday window Mon–Wed", () => {
    expect(moscowActualAppointmentWindowYmd("2026-07-27")).toEqual({
      startYmd: "2026-07-27",
      endYmd: "2026-07-29",
    });
  });

  it("Friday window Fri–Tue including weekend", () => {
    expect(moscowActualAppointmentWindowYmd("2026-07-31")).toEqual({
      startYmd: "2026-07-31",
      endYmd: "2026-08-04",
    });
  });
});
