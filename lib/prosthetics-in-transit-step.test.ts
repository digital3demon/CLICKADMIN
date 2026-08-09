import { describe, expect, it } from "vitest";
import {
  canAdvanceProstheticsProgressStep,
  prostheticsInTransitStepFromDates,
} from "@/lib/prosthetics-in-transit-step";

describe("prostheticsInTransitStepFromDates", () => {
  it("ordered when only resolved", () => {
    expect(
      prostheticsInTransitStepFromDates({
        resolvedAt: "2026-08-01T10:00:00.000Z",
      }),
    ).toBe("ordered");
  });

  it("arrived when arrivedAt set", () => {
    expect(
      prostheticsInTransitStepFromDates({
        resolvedAt: "2026-08-01T10:00:00.000Z",
        arrivedAt: "2026-08-02T10:00:00.000Z",
      }),
    ).toBe("arrived");
  });

  it("checked when checkedAt set", () => {
    expect(
      prostheticsInTransitStepFromDates({
        resolvedAt: "2026-08-01T10:00:00.000Z",
        arrivedAt: "2026-08-02T10:00:00.000Z",
        checkedAt: "2026-08-03T10:00:00.000Z",
      }),
    ).toBe("checked");
  });

  it("done when completedAt set", () => {
    expect(
      prostheticsInTransitStepFromDates({
        resolvedAt: "2026-08-01T10:00:00.000Z",
        arrivedAt: "2026-08-02T10:00:00.000Z",
        checkedAt: "2026-08-03T10:00:00.000Z",
        completedAt: "2026-08-04T10:00:00.000Z",
      }),
    ).toBe("done");
  });
});

describe("canAdvanceProstheticsProgressStep", () => {
  const ordered = {
    resolvedAt: "2026-08-01T10:00:00.000Z",
    arrivedAt: null,
    checkedAt: null,
    completedAt: null,
  };

  it("allows arrived from ordered", () => {
    expect(canAdvanceProstheticsProgressStep(ordered, "arrived").ok).toBe(true);
  });

  it("blocks skip to checked from ordered", () => {
    const r = canAdvanceProstheticsProgressStep(ordered, "checked");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/пришла/i);
  });

  it("blocks skip to completed from ordered", () => {
    const r = canAdvanceProstheticsProgressStep(ordered, "completed");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/проверил/i);
  });

  it("allows checked only after arrived", () => {
    const arrived = {
      ...ordered,
      arrivedAt: "2026-08-02T10:00:00.000Z",
    };
    expect(canAdvanceProstheticsProgressStep(arrived, "checked").ok).toBe(true);
    expect(canAdvanceProstheticsProgressStep(arrived, "arrived").ok).toBe(false);
    expect(canAdvanceProstheticsProgressStep(arrived, "completed").ok).toBe(
      false,
    );
  });

  it("allows completed after checked (legacy: checked without completed)", () => {
    const checked = {
      ...ordered,
      arrivedAt: "2026-08-02T10:00:00.000Z",
      checkedAt: "2026-08-03T10:00:00.000Z",
    };
    expect(canAdvanceProstheticsProgressStep(checked, "completed").ok).toBe(
      true,
    );
    expect(canAdvanceProstheticsProgressStep(checked, "checked").ok).toBe(
      false,
    );
  });

  it("treats checked+completed as done (Проверил закрывает)", () => {
    expect(
      prostheticsInTransitStepFromDates({
        resolvedAt: "2026-08-01T10:00:00.000Z",
        arrivedAt: "2026-08-02T10:00:00.000Z",
        checkedAt: "2026-08-03T10:00:00.000Z",
        completedAt: "2026-08-03T10:00:00.000Z",
      }),
    ).toBe("done");
  });

  it("blocks any progress after completed", () => {
    const done = {
      ...ordered,
      arrivedAt: "2026-08-02T10:00:00.000Z",
      checkedAt: "2026-08-03T10:00:00.000Z",
      completedAt: "2026-08-04T10:00:00.000Z",
    };
    expect(canAdvanceProstheticsProgressStep(done, "arrived").ok).toBe(false);
    expect(canAdvanceProstheticsProgressStep(done, "checked").ok).toBe(false);
    expect(canAdvanceProstheticsProgressStep(done, "completed").ok).toBe(false);
  });
});
