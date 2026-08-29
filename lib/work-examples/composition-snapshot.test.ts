import { describe, expect, it } from "vitest";
import {
  parseCompositionSnapshot,
  snapshotLabComposition,
} from "@/lib/work-examples/composition-snapshot";

describe("snapshotLabComposition", () => {
  it("берёт лабораторные строки без скидок, кириллица в названии", () => {
    const lines = snapshotLabComposition([
      {
        quantity: 2,
        unitPrice: 15000,
        priceListItem: { name: "Коронка Zr Шубина" },
      },
      {
        quantity: 1,
        unitPrice: 8000,
        constructionType: { name: "Моделировка" },
      },
    ]);
    expect(lines).toEqual([
      {
        name: "Коронка Zr Шубина",
        quantity: 2,
        unitPriceRub: 15000,
        lineTotalRub: 30000,
      },
      {
        name: "Моделировка",
        quantity: 1,
        unitPriceRub: 8000,
        lineTotalRub: 8000,
      },
    ]);
  });

  it("не пишет скидки, даже если их подсунули в сырой JSON", () => {
    const parsed = parseCompositionSnapshot([
      {
        name: "Винир Перчак",
        quantity: 1,
        unitPriceRub: 12000,
        lineDiscountPercent: 20,
        compositionDiscountPercent: 10,
        inventoryItemId: "скл-1",
      },
    ]);
    expect(parsed[0]).toEqual({
      name: "Винир Перчак",
      quantity: 1,
      unitPriceRub: 12000,
      lineTotalRub: 12000,
    });
    expect(JSON.stringify(parsed)).not.toContain("inventory");
    expect(JSON.stringify(parsed)).not.toContain("Discount");
  });
});
