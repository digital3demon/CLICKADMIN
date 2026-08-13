import { describe, expect, it } from "vitest";
import { OrderAttachmentScope } from "@prisma/client";
import { isOrderAttachmentEligibleForKaitenPush } from "@/lib/kaiten-attachment-eligibility";

describe("isOrderAttachmentEligibleForKaitenPush", () => {
  const order = { invoiceAttachmentId: "inv-1" };

  it("blocks payment slip and scanner", () => {
    expect(
      isOrderAttachmentEligibleForKaitenPush({
        id: "a1",
        scope: OrderAttachmentScope.PAYMENT_SLIP,
        order,
      }),
    ).toBe(false);
    expect(
      isOrderAttachmentEligibleForKaitenPush({
        id: "a2",
        scope: OrderAttachmentScope.SCANNER,
        order,
      }),
    ).toBe(false);
  });

  it("blocks invoice attachment id", () => {
    expect(
      isOrderAttachmentEligibleForKaitenPush({
        id: "inv-1",
        scope: OrderAttachmentScope.GENERAL,
        order,
      }),
    ).toBe(false);
  });

  it("allows general file", () => {
    expect(
      isOrderAttachmentEligibleForKaitenPush({
        id: "a3",
        scope: OrderAttachmentScope.GENERAL,
        order,
      }),
    ).toBe(true);
  });
});
