import { describe, expect, it } from "vitest";
import { aggregateProstheticLinesForReconciliationPdf } from "@/lib/clinic-reconciliation-prosthetic-lines";
import { prostheticsFromDb } from "@/lib/order-prosthetics";

describe("сверка: протетика только из наряда", () => {
  it("кол-во и сумма из order.prosthetics.ourLines (симптом 01773: 4, не 6)", () => {
    const fromOrder = prostheticsFromDb({
      v: 1,
      clientProvided: [],
      ourLines: [
        {
          inventoryItemId: "01773",
          quantity: 4,
          warehouseId: "протетика",
        },
      ],
    }).ourLines;

    const itemsById = new Map([
      [
        "01773",
        { name: "Аналог 01773", saleUnitPriceRub: 1630 as number | null },
      ],
    ]);
    expect(
      aggregateProstheticLinesForReconciliationPdf(fromOrder, itemsById),
    ).toEqual([
      {
        itemId: "01773",
        name: "Аналог 01773",
        qty: 4,
        totalRub: 6520,
      },
    ]);
  });

  it("пустой prosthetics — нет строк (склад не подмешиваем; кириллица в id)", () => {
    const fromOrder = prostheticsFromDb({
      v: 1,
      clientProvided: [],
      ourLines: [],
    }).ourLines;
    expect(
      aggregateProstheticLinesForReconciliationPdf(
        fromOrder,
        new Map([
          ["аналог-а", { name: "Аналог", saleUnitPriceRub: 100 }],
        ]),
      ),
    ).toEqual([]);
  });
});
