import { describe, expect, it } from "vitest";
import {
  ordersListCreatedAtPeriod,
  ordersListDueDatePeriod,
} from "@/lib/orders-list-period";

describe("ordersListCreatedAtPeriod (LAB due range)", () => {
  it("returns none when both empty", () => {
    expect(ordersListCreatedAtPeriod(null, null)).toEqual({ mode: "none" });
  });

  it("builds inclusive Moscow range for a single day", () => {
    const r = ordersListCreatedAtPeriod("2026-07-31", "2026-07-31");
    expect(r.mode).toBe("range");
    if (r.mode !== "range") return;
    expect(r.fromYmd).toBe("2026-07-31");
    expect(r.toYmd).toBe("2026-07-31");
    expect(r.endExclusive.getTime()).toBeGreaterThan(r.start.getTime());
  });

  it("keeps DueDate alias equal to CreatedAt export", () => {
    const a = ordersListDueDatePeriod("2026-07-24", "2026-07-31");
    const b = ordersListCreatedAtPeriod("2026-07-24", "2026-07-31");
    expect(b).toEqual(a);
  });
});
