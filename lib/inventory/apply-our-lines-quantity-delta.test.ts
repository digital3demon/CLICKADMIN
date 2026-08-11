import { describe, expect, it } from "vitest";
import { applyOurLinesQuantityDelta } from "@/lib/inventory/apply-our-lines-quantity-delta";
import { emptyProsthetics } from "@/lib/order-prosthetics";

describe("applyOurLinesQuantityDelta", () => {
  it("adds new our line on positive delta", () => {
    const next = applyOurLinesQuantityDelta(
      emptyProsthetics(),
      "item-1",
      "wh-1",
      2,
    );
    expect(next.ourLines).toEqual([
      { inventoryItemId: "item-1", quantity: 2, warehouseId: "wh-1" },
    ]);
  });

  it("increments existing line", () => {
    const prev = emptyProsthetics();
    prev.ourLines.push({
      inventoryItemId: "item-1",
      quantity: 1,
      warehouseId: "wh-1",
    });
    const next = applyOurLinesQuantityDelta(prev, "item-1", "wh-1", 3);
    expect(next.ourLines).toEqual([
      { inventoryItemId: "item-1", quantity: 4, warehouseId: "wh-1" },
    ]);
  });

  it("reduces and drops zero lines on negative delta", () => {
    const prev = emptyProsthetics();
    prev.ourLines.push({ inventoryItemId: "item-1", quantity: 2 });
    const next = applyOurLinesQuantityDelta(prev, "item-1", "wh-1", -2);
    expect(next.ourLines).toEqual([]);
  });

  it("keeps clientProvided untouched", () => {
    const prev = emptyProsthetics();
    prev.clientProvided.push({ description: "от клиники", quantity: 1 });
    const next = applyOurLinesQuantityDelta(prev, "item-1", "wh-1", 1);
    expect(next.clientProvided).toEqual([
      { description: "от клиники", quantity: 1 },
    ]);
    expect(next.ourLines).toHaveLength(1);
  });
});
