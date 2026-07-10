import { describe, expect, it } from "vitest";
import { isoToDatetimeLocal, localDateTimeToIso } from "@/lib/datetime-local";

describe("isoToDatetimeLocal (Europe/Moscow)", () => {
  it("maps UTC noon to 15:00 Moscow", () => {
    expect(isoToDatetimeLocal("2026-07-10T12:00:00.000Z")).toBe(
      "2026-07-10T15:00",
    );
  });

  it("maps late UTC evening across Moscow calendar day", () => {
    // 22:30 UTC = 01:30 next day MSK
    expect(isoToDatetimeLocal("2026-07-10T22:30:00.000Z")).toBe(
      "2026-07-11T01:30",
    );
  });

  it("returns empty for empty/invalid", () => {
    expect(isoToDatetimeLocal(null)).toBe("");
    expect(isoToDatetimeLocal("")).toBe("");
    expect(isoToDatetimeLocal("not-a-date")).toBe("");
  });

  it("is stable regardless of process TZ (same ISO → same wall string)", () => {
    const iso = "2026-01-15T09:15:00.000Z";
    const a = isoToDatetimeLocal(iso);
    expect(a).toBe("2026-01-15T12:15");
    expect(isoToDatetimeLocal(iso)).toBe(a);
  });
});

describe("localDateTimeToIso (Europe/Moscow wall)", () => {
  it("converts Moscow wall to UTC ISO", () => {
    expect(localDateTimeToIso("2026-07-10T15:00")).toBe(
      "2026-07-10T12:00:00.000Z",
    );
  });

  it("round-trips with isoToDatetimeLocal", () => {
    const local = "2026-03-20T18:30";
    const iso = localDateTimeToIso(local);
    expect(iso).toBeTruthy();
    expect(isoToDatetimeLocal(iso)).toBe(local);
  });

  it("returns null for empty", () => {
    expect(localDateTimeToIso("")).toBeNull();
    expect(localDateTimeToIso("   ")).toBeNull();
  });
});
