import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAYROLL_KIND_TRACK_MAP,
  isPayrollKindVisibleForTrack,
} from "@/lib/payroll-tracks";

describe("isPayrollKindVisibleForTrack", () => {
  const map = DEFAULT_PAYROLL_KIND_TRACK_MAP;

  it("Цифра видит CAD", () => {
    expect(isPayrollKindVisibleForTrack("CAD", "DIGITAL", map)).toBe(true);
    expect(isPayrollKindVisibleForTrack("MANUAL", "DIGITAL", map)).toBe(false);
  });

  it("Цифра+Мануал видит CAD и MANUAL", () => {
    expect(isPayrollKindVisibleForTrack("CAD", "DIGITAL_MANUAL", map)).toBe(true);
    expect(isPayrollKindVisibleForTrack("MANUAL", "DIGITAL_MANUAL", map)).toBe(true);
    expect(isPayrollKindVisibleForTrack("PROCESSING", "DIGITAL_MANUAL", map)).toBe(false);
  });

  it("без направления — всё видно", () => {
    expect(isPayrollKindVisibleForTrack("PROCESSING", null, map)).toBe(true);
  });
});
