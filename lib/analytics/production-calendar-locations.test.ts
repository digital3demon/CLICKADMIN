import { describe, expect, it } from "vitest";
import { searchProductionCalendarLocations } from "@/lib/analytics/production-calendar-locations";

describe("searchProductionCalendarLocations", () => {
  it("finds Moscow by prefix", () => {
    const rows = searchProductionCalendarLocations("моск");
    expect(rows.some((r) => r.id === "ru-moscow")).toBe(true);
  });

  it("finds SPb by alias", () => {
    const rows = searchProductionCalendarLocations("спб");
    expect(rows.some((r) => r.id === "ru-spb")).toBe(true);
  });
});
