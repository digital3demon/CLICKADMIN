import { describe, expect, it } from "vitest";
import {
  costCorrectionPriceOrSkip,
  parseInventoryMoneyRub,
  prostheticWorkTotalRub,
} from "@/lib/inventory/sale-unit-price";

describe("parseInventoryMoneyRub", () => {
  it("пусто и число, кириллическая запятая", () => {
    expect(parseInventoryMoneyRub("")).toBeNull();
    expect(parseInventoryMoneyRub("1200")).toBe(1200);
    expect(parseInventoryMoneyRub("595,5")).toBe(595.5);
    expect(parseInventoryMoneyRub("нет")).toBe("invalid");
  });
});

describe("costCorrectionPriceOrSkip", () => {
  it("0 и пусто — не менять, кириллическая запятая — цена", () => {
    expect(costCorrectionPriceOrSkip(0)).toBeNull();
    expect(costCorrectionPriceOrSkip("0")).toBeNull();
    expect(costCorrectionPriceOrSkip("")).toBeNull();
    expect(costCorrectionPriceOrSkip("1200,5")).toBe(1200.5);
    expect(costCorrectionPriceOrSkip("595,5")).toBe(595.5);
    expect(costCorrectionPriceOrSkip(-1)).toBe("invalid");
  });
});

describe("prostheticWorkTotalRub", () => {
  it("реализация важнее закупки", () => {
    expect(
      prostheticWorkTotalRub({
        quantity: 2,
        saleUnitPriceRub: 800,
        fallbackTotalRub: 100,
      }),
    ).toBe(1600);
  });

  it("без реализации — сумма списания (закупка)", () => {
    expect(
      prostheticWorkTotalRub({
        quantity: 2,
        saleUnitPriceRub: null,
        fallbackTotalRub: 1050,
      }),
    ).toBe(1050);
  });
});
