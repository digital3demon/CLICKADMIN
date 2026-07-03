import { describe, expect, it } from "vitest";
import { orderActiveInboundSyncWhere } from "@/lib/order-active-inbound-sync";

describe("orderActiveInboundSyncWhere", () => {
  it("активный наряд = не отгружен (adminShippedOtpr false)", () => {
    expect(orderActiveInboundSyncWhere()).toEqual({ adminShippedOtpr: false });
  });
});
