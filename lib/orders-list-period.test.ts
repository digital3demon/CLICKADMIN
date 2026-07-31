import { describe, expect, it } from "vitest";
import {
  ordersListCreatedAtPeriod,
  ordersListDueDatePeriod,
} from "@/lib/orders-list-period";

describe("ordersListDueDatePeriod", () => {
  it("returns none when both empty", () => {
    expect(ordersListDueDatePeriod(null, null)).toEqual({ mode: "none" });
  });

  it("builds inclusive Moscow range for a single day", () => {
    const r = ordersListDueDatePeriod("2026-07-31", "2026-07-31");
    expect(r.mode).toBe("range");
    if (r.mode !== "range") return;
    expect(r.fromYmd).toBe("2026-07-31");
    expect(r.toYmd).toBe("2026-07-31");
    expect(r.endExclusive.getTime()).toBeGreaterThan(r.start.getTime());
  });

  it("keeps deprecated alias pointing at due-date period", () => {
    const a = ordersListDueDatePeriod("2026-07-24", "2026-07-31");
    const b = ordersListCreatedAtPeriod("2026-07-24", "2026-07-31");
    expect(b).toEqual(a);
  });
});
