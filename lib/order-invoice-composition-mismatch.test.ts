import { describe, expect, it } from "vitest";
import {
  invoiceMismatchFingerprintFor,
  orderInvoiceCompositionMismatch,
  uniqueAttentionOrderCount,
} from "@/lib/order-invoice-composition-mismatch";

const allOnX = {
  quantity: 1,
  unitPrice: 75_000,
  lineDiscountPercent: 0,
};

describe("orderInvoiceCompositionMismatch", () => {
  it("совпадение состава и счёта — не расхождение", () => {
    expect(
      orderInvoiceCompositionMismatch({
        invoiceParsedTotalRub: 75_000,
        isUrgent: false,
        urgentCoefficient: null,
        constructions: [allOnX],
      }),
    ).toBe(false);
  });

  it("счёт не сходится с составом (кириллический наряд ALL ON X)", () => {
    expect(
      orderInvoiceCompositionMismatch({
        invoiceParsedTotalRub: 80_000,
        isUrgent: false,
        urgentCoefficient: null,
        constructions: [allOnX],
      }),
    ).toBe(true);
  });

  it("без разобранной суммы счёта — не считать", () => {
    expect(
      orderInvoiceCompositionMismatch({
        invoiceParsedTotalRub: null,
        isUrgent: false,
        urgentCoefficient: null,
        constructions: [allOnX],
      }),
    ).toBe(false);
  });

  it("подтверждение той же пары сумм снимает индикацию", () => {
    const o = {
      invoiceParsedTotalRub: 87_950,
      isUrgent: false,
      urgentCoefficient: null,
      constructions: [allOnX],
    };
    const fp = invoiceMismatchFingerprintFor(o);
    expect(fp).toBe("87950:75000");
    expect(orderInvoiceCompositionMismatch({ ...o, invoiceMismatchAckFingerprint: fp })).toBe(
      false,
    );
    expect(
      orderInvoiceCompositionMismatch({
        ...o,
        invoiceMismatchAckFingerprint: "87950:75001",
      }),
    ).toBe(true);
  });

  it("скидка наряда не уменьшает протетику в составе", () => {
    expect(
      orderInvoiceCompositionMismatch({
        invoiceParsedTotalRub: 1800,
        isUrgent: true,
        urgentCoefficient: 2,
        compositionDiscountPercent: 50,
        constructions: [{ quantity: 1, unitPrice: 1000, lineDiscountPercent: 0 }],
        prostheticsOurRub: 800,
      }),
    ).toBe(false);
  });

  it("после подтверждения новая сумма снова светится", () => {
    const o = {
      invoiceParsedTotalRub: 87_950,
      isUrgent: false,
      urgentCoefficient: null,
      constructions: [allOnX],
    };
    const fp = invoiceMismatchFingerprintFor(o);
    expect(
      orderInvoiceCompositionMismatch({
        ...o,
        invoiceParsedTotalRub: 90_000,
        invoiceMismatchAckFingerprint: fp,
      }),
    ).toBe(true);
  });
});

describe("uniqueAttentionOrderCount", () => {
  it("чат 1 + другой наряд со счётом = 2", () => {
    expect(
      uniqueAttentionOrderCount(["corr-1"], ["invoice-mismatch-2"]),
    ).toBe(2);
  });

  it("один наряд и в чате, и по счёту — один раз", () => {
    expect(uniqueAttentionOrderCount(["same"], ["same"])).toBe(1);
  });
});
