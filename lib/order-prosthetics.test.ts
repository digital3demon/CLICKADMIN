import { describe, expect, it } from "vitest";
import {
  aggregateOurQuantities,
  emptyProsthetics,
  normalizeProstheticsInput,
} from "./order-prosthetics";

describe("normalizeProstheticsInput", () => {
  it("пустой ввод → empty", () => {
    expect(normalizeProstheticsInput(null)).toEqual(emptyProsthetics());
    expect(normalizeProstheticsInput(undefined)).toEqual(emptyProsthetics());
  });

  it("старый payload без warehouseId сохраняет позицию и qty", () => {
    const n = normalizeProstheticsInput({
      v: 1,
      clientProvided: [],
      ourLines: [{ inventoryItemId: "item-1", quantity: 2 }],
    });
    expect(n.ourLines).toEqual([{ inventoryItemId: "item-1", quantity: 2 }]);
    expect(n.ourLines[0]?.warehouseId).toBeUndefined();
  });

  it("читает warehouseId в строке", () => {
    const n = normalizeProstheticsInput({
      ourLines: [
        { inventoryItemId: "item-2", quantity: 3, warehouseId: "wh-a" },
        { inventoryItemId: "  ", quantity: 1, warehouseId: "wh-b" },
      ],
    });
    expect(n.ourLines).toEqual([
      { inventoryItemId: "item-2", quantity: 3, warehouseId: "wh-a" },
    ]);
  });

  it("кириллица в clientProvided не теряется", () => {
    const n = normalizeProstheticsInput({
      clientProvided: [{ description: "временные коронки", quantity: 1 }],
      ourLines: [],
    });
    expect(n.clientProvided[0]?.description).toBe("временные коронки");
  });
});

describe("aggregateOurQuantities", () => {
  it("складывает qty по одному inventoryItemId", () => {
    const m = aggregateOurQuantities({
      v: 1,
      clientProvided: [],
      ourLines: [
        { inventoryItemId: "a", quantity: 2, warehouseId: "w1" },
        { inventoryItemId: "a", quantity: 3, warehouseId: "w1" },
        { inventoryItemId: "b", quantity: 1 },
      ],
    });
    expect(m.get("a")).toBe(5);
    expect(m.get("b")).toBe(1);
  });
});
