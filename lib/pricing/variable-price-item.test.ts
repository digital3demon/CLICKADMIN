import { describe, expect, it } from "vitest";
import { isPriceListUnitPriceEditable } from "./variable-price-item";

describe("isPriceListUnitPriceEditable", () => {
  it("разрешает правку при variablePrice", () => {
    expect(isPriceListUnitPriceEditable({ variablePrice: true })).toBe(true);
  });

  it("запрещает без флага и для КП", () => {
    expect(isPriceListUnitPriceEditable({ variablePrice: false })).toBe(false);
    expect(
      isPriceListUnitPriceEditable({
        variablePrice: true,
        blockAsCorrectionKp: true,
      }),
    ).toBe(false);
  });
});
