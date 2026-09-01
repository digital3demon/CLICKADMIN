import { describe, expect, it, vi } from "vitest";
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

  it("пустой JSON восстанавливается из SALE_ISSUE", async () => {
    const db = {
      stockMovement: {
        findMany: async () => [
          {
            kind: "SALE_ISSUE",
            itemId: "абатмент",
            warehouseId: "протетика",
            quantity: 2,
            returnedToWarehouseAt: null,
          },
        ],
      },
      order: {
        update: vi.fn(),
      },
    };
    const shown = await hydrateOrderProstheticsFromStock(db as never, {
      id: "o-restore",
      prosthetics: null,
    });
    expect(shown.ourLines).toEqual([
      { inventoryItemId: "абатмент", quantity: 2, warehouseId: "протетика" },
    ]);
    expect(db.order.update).toHaveBeenCalled();
  });

  it("сохранённый JSON не перезаписывается старым SALE_ISSUE", async () => {
    const saved = {
      v: 1 as const,
      clientProvided: [] as const,
      ourLines: [{ inventoryItemId: "новая", quantity: 1, warehouseId: "протетика" }],
    };
    const db = {
      stockMovement: {
        findMany: async () => [
          {
            kind: "SALE_ISSUE",
            itemId: "старая",
            warehouseId: "протетика",
            quantity: 5,
            returnedToWarehouseAt: null,
          },
        ],
      },
      order: { update: vi.fn() },
    };
    const shown = await hydrateOrderProstheticsFromStock(db as never, {
      id: "o2",
      prosthetics: saved,
    });
    expect(shown.ourLines).toEqual(saved.ourLines);
    expect(db.order.update).not.toHaveBeenCalled();
  });
});
