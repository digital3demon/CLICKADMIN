import { describe, expect, it } from "vitest";
import {
  buildPayrollImportPreview,
  parsePayrollAmountCell,
  parsePayrollWorksheetRows,
} from "@/lib/payroll-xlsx";
import ExcelJS from "exceljs";

describe("parsePayrollAmountCell", () => {
  it("принимает целые и дробные с запятой", () => {
    expect(parsePayrollAmountCell("1 500")).toBe(1500);
    expect(parsePayrollAmountCell("250,5")).toBe(251);
  });

  it("пустое и ноль — null", () => {
    expect(parsePayrollAmountCell("")).toBeNull();
    expect(parsePayrollAmountCell("0")).toBeNull();
  });
});

describe("parsePayrollWorksheetRows", () => {
  it("читает блок прайса и без категории", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("ФОТ");
    const h = ws.getRow(2);
    h.getCell(1).value = "Код";
    h.getCell(2).value = "Позиция";
    h.getCell(3).value = "CAD (₽)";
    h.getCell(4).value = "Мануал (₽)";
    const data = ws.getRow(3);
    data.getCell(1).value = "1001";
    data.getCell(2).value = "Коронка";
    data.getCell(3).value = 500;
    data.getCell(4).value = 300;
    ws.getRow(5).getCell(1).value = "--- БЕЗ КАТЕГОРИИ ---";
    const uh = ws.getRow(6);
    uh.getCell(1).value = "Код";
    uh.getCell(2).value = "Позиция прайса";
    uh.getCell(3).value = "Название плашки";
    uh.getCell(4).value = "Цена (₽)";
    const u = ws.getRow(7);
    u.getCell(1).value = "1002";
    u.getCell(2).value = "Винт";
    u.getCell(3).value = "Доп. работа";
    u.getCell(4).value = 120;

    const parsed = parsePayrollWorksheetRows(ws);
    expect(parsed.main).toHaveLength(1);
    expect(parsed.main[0]?.amounts.CAD).toBe(500);
    expect(parsed.main[0]?.amounts.MANUAL).toBe(300);
    expect(parsed.uncategorized).toHaveLength(1);
    expect(parsed.uncategorized[0]?.description).toBe("Доп. работа");
  });
});

describe("buildPayrollImportPreview", () => {
  it("помечает create и update", () => {
    const preview = buildPayrollImportPreview({
      priceItems: [{ id: "p1", code: "1001", name: "Коронка" }],
      existingConfigs: [
        {
          id: "c1",
          priceListItemId: "p1",
          kind: "CAD",
          amountRub: 400,
          description: "CAD · 1001",
        },
      ],
      main: [{ rowNumber: 3, code: "1001", priceName: "Коронка", amounts: { CAD: 500 } }],
      uncategorized: [],
    });
    expect(preview[0]?.action).toBe("update");
    expect(preview[0]?.existingConfigId).toBe("c1");
  });
});
