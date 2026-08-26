import { describe, expect, it } from "vitest";
import { orderConstructionsFingerprint } from "@/lib/order-constructions-fingerprint";

describe("orderConstructionsFingerprint", () => {
  it("одинаковый состав (кириллица в оттенке) даёт один отпечаток", () => {
    const a = orderConstructionsFingerprint([
      {
        category: "PRICE_LIST",
        priceListItemId: "pl-3301",
        quantity: 1,
        unitPrice: 13500,
        lineDiscountPercent: 30,
        shade: "A2 светлый",
        teethFdi: ["16", "11"],
        sortOrder: 0,
      },
    ]);
    const b = orderConstructionsFingerprint([
      {
        category: "PRICE_LIST",
        priceListItemId: "pl-3301",
        quantity: 1,
        unitPrice: 13500,
        lineDiscountPercent: 30,
        shade: "A2 светлый",
        teethFdi: ["11", "16"],
        sortOrder: 0,
      },
    ]);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("удалённая плитка меняет отпечаток", () => {
    const withTile = orderConstructionsFingerprint([
      { category: "PRICE_LIST", priceListItemId: "3301", quantity: 1, sortOrder: 0 },
      { category: "PRICE_LIST", priceListItemId: "717", quantity: 4, sortOrder: 1 },
    ]);
    const withoutTile = orderConstructionsFingerprint([
      { category: "PRICE_LIST", priceListItemId: "717", quantity: 4, sortOrder: 0 },
    ]);
    expect(withTile).not.toBe(withoutTile);
  });

  it("пустой состав стабилен", () => {
    expect(orderConstructionsFingerprint([])).toBe(
      orderConstructionsFingerprint([]),
    );
  });
});
