import { describe, expect, it } from "vitest";
import {
  canAdvanceProstheticsProgressStep,
  prostheticsInTransitStepFromDates,
} from "@/lib/prosthetics-in-transit-step";

describe("prostheticsInTransitStepFromDates", () => {
  it("confirmed when only resolved", () => {
    expect(
      prostheticsInTransitStepFromDates({
        resolvedAt: "2026-08-01T10:00:00.000Z",
      }),
    ).toBe("confirmed");
  });

  it("ordered when orderedAt set", () => {
    expect(
      prostheticsInTransitStepFromDates({
        resolvedAt: "2026-08-01T10:00:00.000Z",
        orderedAt: "2026-08-01T11:00:00.000Z",
      }),
    ).toBe("ordered");
  });

  it("arrived when arrivedAt set", () => {
    expect(
      prostheticsInTransitStepFromDates({
        resolvedAt: "2026-08-01T10:00:00.000Z",
        orderedAt: "2026-08-01T11:00:00.000Z",
        arrivedAt: "2026-08-02T10:00:00.000Z",
      }),
    ).toBe("arrived");
  });

  it("checked when checkedAt set", () => {
    expect(
      prostheticsInTransitStepFromDates({
        resolvedAt: "2026-08-01T10:00:00.000Z",
        orderedAt: "2026-08-01T11:00:00.000Z",
        arrivedAt: "2026-08-02T10:00:00.000Z",
        checkedAt: "2026-08-03T10:00:00.000Z",
      }),
    ).toBe("checked");
  });

  it("done when completedAt set", () => {
    expect(
      prostheticsInTransitStepFromDates({
        resolvedAt: "2026-08-01T10:00:00.000Z",
        orderedAt: "2026-08-01T11:00:00.000Z",
        arrivedAt: "2026-08-02T10:00:00.000Z",
        checkedAt: "2026-08-03T10:00:00.000Z",
        completedAt: "2026-08-04T10:00:00.000Z",
      }),
    ).toBe("done");
  });
});

describe("canAdvanceProstheticsProgressStep", () => {
  const confirmed = {
    resolvedAt: "2026-08-01T10:00:00.000Z",
    orderedAt: null,
    arrivedAt: null,
    checkedAt: null,
    completedAt: null,
  };

  const ordered = {
    ...confirmed,
    orderedAt: "2026-08-01T11:00:00.000Z",
  };

  it("allows ordered from confirmed", () => {
    expect(canAdvanceProstheticsProgressStep(confirmed, "ordered").ok).toBe(
      true,
    );
  });

  it("blocks arrived from confirmed", () => {
    const r = canAdvanceProstheticsProgressStep(confirmed, "arrived");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/заказал/i);
  });

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

  it("allows completed after checked", () => {
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

  it("treats completedAt as done (Готово)", () => {
    expect(
      prostheticsInTransitStepFromDates({
        resolvedAt: "2026-08-01T10:00:00.000Z",
        orderedAt: "2026-08-01T11:00:00.000Z",
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
    expect(canAdvanceProstheticsProgressStep(done, "ordered").ok).toBe(false);
    expect(canAdvanceProstheticsProgressStep(done, "arrived").ok).toBe(false);
    expect(canAdvanceProstheticsProgressStep(done, "checked").ok).toBe(false);
    expect(canAdvanceProstheticsProgressStep(done, "completed").ok).toBe(false);
  });
});
