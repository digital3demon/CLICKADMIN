import { describe, expect, it } from "vitest";
import {
  aggregateSaleIssueOurLines,
  hydrateOrderProstheticsFromStock,
  mergeOurLinesPreferringStock,
  netStockOurLines,
} from "@/lib/inventory/our-lines-from-sale-issues";

describe("our lines from SALE_ISSUE", () => {
  it("складывает одинаковые позиции и склад", () => {
    expect(
      aggregateSaleIssueOurLines([
        { itemId: "a", warehouseId: "wh", quantity: 1 },
        { itemId: "a", warehouseId: "wh", quantity: 1 },
        { itemId: "b", warehouseId: "wh", quantity: 1 },
      ]),
    ).toEqual([
      { inventoryItemId: "a", quantity: 2, warehouseId: "wh" },
      { inventoryItemId: "b", quantity: 1, warehouseId: "wh" },
    ]);
  });

  it("кириллица в id не режет соседние строки", () => {
    const lines = aggregateSaleIssueOurLines([
      { itemId: "дент-1", warehouseId: "протетика", quantity: 1 },
    ]);
    expect(lines).toEqual([
      {
        inventoryItemId: "дент-1",
        quantity: 1,
        warehouseId: "протетика",
      },
    ]);
    expect(
      mergeOurLinesPreferringStock(
        [{ inventoryItemId: "черновик", quantity: 1, warehouseId: "протетика" }],
        lines,
      ),
    ).toEqual([
      ...lines,
      { inventoryItemId: "черновик", quantity: 1, warehouseId: "протетика" },
    ]);
  });

  it("пустой склад не затирает JSON", () => {
    const json = [{ inventoryItemId: "x", quantity: 3 }];
    expect(mergeOurLinesPreferringStock(json, [])).toEqual(json);
  });

  it("RETURN_IN снимает списание: кириллица до и после позиции", () => {
    const net = netStockOurLines(
      [
        { itemId: "абатмент", warehouseId: "протетика", quantity: 2 },
        { itemId: "абатмент", warehouseId: "протетика", quantity: 1 },
      ],
      [{ itemId: "абатмент", warehouseId: "протетика", quantity: 2 }],
    );
    expect(net).toEqual([
      {
        inventoryItemId: "абатмент",
        quantity: 1,
        warehouseId: "протетика",
      },
    ]);
  });

  it("полный возврат убирает позицию — сохранённый JSON не затираем", async () => {
    const saved = {
      v: 1 as const,
      clientProvided: [] as const,
      ourLines: [{ inventoryItemId: "абатмент", quantity: 1, warehouseId: "протетика" }],
    };
    const shown = await hydrateOrderProstheticsFromStock(
      {} as never,
      { id: "o1", prosthetics: saved },
    );
    expect(shown.ourLines).toEqual(saved.ourLines);
  });
});
