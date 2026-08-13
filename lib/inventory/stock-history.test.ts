import { describe, expect, it } from "vitest";
import { formatStockHistoryDescription } from "@/lib/inventory/stock-history";

describe("formatStockHistoryDescription", () => {
  it("purchase → внесено", () => {
    const r = formatStockHistoryDescription({
      kind: "PURCHASE_RECEIPT",
      quantity: 5,
      unit: "шт",
      itemLabel: "A3 · Циркон",
      warehouseName: "Производство",
    });
    expect(r.kindLabel).toBe("Приход (закупка)");
    expect(r.description).toBe(
      "Внесено 5 шт «A3 · Циркон» на склад «Производство»",
    );
  });

  it("adjustment plus → добавлено", () => {
    const r = formatStockHistoryDescription({
      kind: "ADJUSTMENT_PLUS",
      quantity: 2,
      unit: "шт",
      itemLabel: "Диск",
      warehouseName: "Основной",
    });
    expect(r.description).toMatch(/^Добавлено 2 шт/);
  });

  it("sale issue includes order number", () => {
    const r = formatStockHistoryDescription({
      kind: "SALE_ISSUE",
      quantity: 1,
      unit: "шт",
      itemLabel: "Абатмент",
      warehouseName: "Производство",
      orderNumber: "2608-186",
    });
    expect(r.description).toContain("2608-186");
    expect(r.description).toMatch(/^Списано/);
  });

  it("appends note", () => {
    const r = formatStockHistoryDescription({
      kind: "MANUAL_ISSUE",
      quantity: 1,
      unit: "шт",
      itemLabel: "X",
      warehouseName: "Y",
      note: "брак на входе",
    });
    expect(r.description.endsWith("брак на входе")).toBe(true);
  });
});
