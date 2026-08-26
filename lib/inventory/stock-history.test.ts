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

  it("коррекция стоимости без списания, кириллица в названии", () => {
    const r = formatStockHistoryDescription({
      kind: "COST_CORRECTION",
      quantity: 1,
      unit: "шт",
      itemLabel: "01127 · Dentium H 2.0",
      warehouseName: "Протетика",
      note: "закупка 120",
    });
    expect(r.kindLabel).toBe("Коррекция стоимости");
    expect(r.description).toBe(
      "Коррекция стоимости «01127 · Dentium H 2.0» на складе «Протетика». закупка 120",
    );
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
