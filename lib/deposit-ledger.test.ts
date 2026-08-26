import { describe, expect, it } from "vitest";
import {
  computeDepositApplyRub,
  depositPartyForOrder,
  orderPayableBeforeDepositRub,
  payableAfterDepositRub,
} from "@/lib/deposit-ledger";
import { orderPayableAfterDepositRub } from "@/lib/format-order-construction";

describe("deposit apply math", () => {
  it("депозит больше заказа: applied = сумма заказа, остаток на балансе", () => {
    const balance = 10_000;
    const payable = 7_000;
    const applied = computeDepositApplyRub(balance, payable);
    expect(applied).toBe(7_000);
    expect(balance - applied).toBe(3_000);
    expect(payableAfterDepositRub(payable, applied)).toBe(0);
  });

  it("депозит меньше заказа: applied = баланс, к оплате остаток", () => {
    const balance = 2_000;
    const payable = 7_000;
    const applied = computeDepositApplyRub(balance, payable);
    expect(applied).toBe(2_000);
    expect(payableAfterDepositRub(payable, applied)).toBe(5_000);
  });

  it("нулевой баланс — не учитываем", () => {
    expect(computeDepositApplyRub(0, 5000)).toBe(0);
    expect(payableAfterDepositRub(5000, null)).toBe(5000);
  });

  it("частная практика / частное лицо → DOCTOR, клиника → CLINIC", () => {
    expect(depositPartyForOrder(null)).toBe("DOCTOR");
    expect(depositPartyForOrder(undefined)).toBe("DOCTOR");
    expect(depositPartyForOrder("__private__")).toBe("DOCTOR");
    expect(depositPartyForOrder("clinic-1")).toBe("CLINIC");
    expect(depositPartyForOrder("clinic-1", "Частное лицо")).toBe("DOCTOR");
    expect(depositPartyForOrder("clinic-1", "шапка Частное лицо хвост")).toBe(
      "CLINIC",
    );
    expect(depositPartyForOrder("clinic-1", "ООО")).toBe("CLINIC");
  });

  it("payable до депозита: состав × срочность", () => {
    const before = orderPayableBeforeDepositRub({
      lines: [
        { quantity: 1, unitPrice: 1000, lineDiscountPercent: 0 },
        { quantity: 2, unitPrice: 500, lineDiscountPercent: 0 },
      ],
      compositionDiscountPercent: 0,
      urgentMultiplier: 2,
    });
    // 1000 + 1000 = 2000 × 2 = 4000
    expect(before).toBe(4000);
  });

  it("orderPayableAfterDepositRub согласован с format-order-construction", () => {
    expect(orderPayableAfterDepositRub(7000, 1, 2000)).toBe(5000);
    expect(orderPayableAfterDepositRub(7000, 1, 10_000)).toBe(0);
  });
});
