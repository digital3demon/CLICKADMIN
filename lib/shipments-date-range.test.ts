import { describe, expect, it } from "vitest";
import { moscowWorkWeekFridayYmd } from "@/lib/shipments-date-range";

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
