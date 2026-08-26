import { describe, expect, it } from "vitest";
import {
  ourLineSaleRub,
  ourLinesSaleTotalRub,
  prostheticsOurSaleTotalFromJson,
} from "@/lib/inventory/our-lines-sale-total";

const items = [
  { id: "dentium-h20", saleUnitPriceRub: 800 },
  { id: "dentium-h13", saleUnitPriceRub: 595.5 },
  { id: "no-sale", saleUnitPriceRub: null },
];

describe("ourLinesSaleTotalRub", () => {
  it("строка без реализации — null, в итог не входит", () => {
    expect(
      ourLineSaleRub({ inventoryItemId: "no-sale", quantity: 2 }, items),
    ).toBeNull();
    expect(
      ourLineSaleRub({ inventoryItemId: "", quantity: 1 }, items),
    ).toBeNull();
  });

  it("скидка не участвует: qty × реализация, кириллица вокруг артикула", () => {
    const total = ourLinesSaleTotalRub(
      [
        { inventoryItemId: "dentium-h20", quantity: 2 },
        { inventoryItemId: "dentium-h13", quantity: 1 },
        { inventoryItemId: "no-sale", quantity: 10 },
      ],
      items,
    );
    // 2×800 + 1×595.5 = 2195.5; «протетика заказана / наше со склада»
    expect(total).toBe(2195.5);
  });

  it("из JSON наряда", () => {
    expect(
      prostheticsOurSaleTotalFromJson(
        {
          v: 1,
          clientProvided: [{ description: "балка клиента", quantity: 1 }],
          ourLines: [{ inventoryItemId: "dentium-h20", quantity: 1 }],
        },
        items,
      ),
    ).toBe(800);
  });
});
