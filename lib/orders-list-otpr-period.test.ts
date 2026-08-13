import { describe, expect, it } from "vitest";
import { ordersListOtprPeriod } from "@/lib/orders-list-otpr-period";
import { ordersListDueDatePeriod } from "@/lib/orders-list-period";

describe("ordersListOtprPeriod (adminShippedAt range, Moscow)", () => {
  it("returns none when both empty", () => {
    expect(ordersListOtprPeriod(null, null)).toEqual({ mode: "none" });
  });

  it("builds inclusive Moscow range matching LAB period helper", () => {
    const otpr = ordersListOtprPeriod("2026-08-06", "2026-08-13");
    const lab = ordersListDueDatePeriod("2026-08-06", "2026-08-13");
    expect(otpr).toEqual(lab);
    expect(otpr.mode).toBe("range");
    if (otpr.mode !== "range") return;
    expect(otpr.fromYmd).toBe("2026-08-06");
    expect(otpr.toYmd).toBe("2026-08-13");
    expect(otpr.endExclusive.getTime()).toBeGreaterThan(otpr.start.getTime());
  });

  it("errors on invalid from", () => {
    const r = ordersListOtprPeriod("не-дата", "2026-08-13");
    expect(r.mode).toBe("error");
  });
});
