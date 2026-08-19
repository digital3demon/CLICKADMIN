import { describe, expect, it } from "vitest";
import { canEditOrders, canLinkEmailsToOrder } from "@/lib/auth/permissions";

describe("canLinkEmailsToOrder", () => {
  it("без матрицы пускает только владельца — админ без флагов нет", () => {
    expect(canEditOrders("OWNER")).toBe(true);
    expect(canLinkEmailsToOrder("OWNER")).toBe(true);
    expect(canEditOrders("ADMINISTRATOR")).toBe(false);
    expect(canLinkEmailsToOrder("ADMINISTRATOR")).toBe(false);
  });

  it("админ с ORDERS_EDIT или MAIL может привязать письмо", () => {
    expect(
      canLinkEmailsToOrder("ADMINISTRATOR", { ORDERS_EDIT: true }),
    ).toBe(true);
    expect(canLinkEmailsToOrder("ADMINISTRATOR", { MAIL: true })).toBe(true);
    expect(
      canLinkEmailsToOrder("ADMINISTRATOR", { ORDERS_EDIT: false, MAIL: false }),
    ).toBe(false);
  });
});
