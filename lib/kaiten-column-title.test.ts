import { describe, expect, it } from "vitest";
import { kaitenTrackLaneListLabel } from "@/lib/kaiten-column-title";

describe("kaitenTrackLaneListLabel", () => {
  it("maps orthopedics and orthodontics with cyrillic labels", () => {
    expect(kaitenTrackLaneListLabel("ORTHOPEDICS")).toBe("Ортопедия");
    expect(kaitenTrackLaneListLabel("ORTHODONTICS")).toBe("Ортодонтия");
    expect(kaitenTrackLaneListLabel("тест")).toBe(null);
    expect(kaitenTrackLaneListLabel("TEST")).toBe("Тест");
  });

  it("returns null for empty and unknown lanes", () => {
    expect(kaitenTrackLaneListLabel(null)).toBe(null);
    expect(kaitenTrackLaneListLabel("")).toBe(null);
    expect(kaitenTrackLaneListLabel("REWORK")).toBe(null);
  });
});
