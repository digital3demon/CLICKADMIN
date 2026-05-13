import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  buildFinanceInvoiceNumber,
  extractOrderNumberFromBankComment,
  normalizeFinanceBankApplyRow,
  parseFinanceBankWorkbook,
} from "@/lib/finance-office-bank-import";

function workbookBuffer(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Оплаты");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("finance office bank import", () => {
  it("extracts order number with Cyrillic around it", () => {
    expect(
      extractOrderNumberFromBankComment("Оплата пациент Иванов 3301 доктор Петров"),
    ).toBe("3301");
  });

  it("parses paid rows and builds invoice caption", () => {
    const rows = parseFinanceBankWorkbook(
      workbookBuffer([
        ["Оплата", "Ответственный", "Комментарий", "НОМЕР", "ДАТА"],
        ["Да", "ООО", "Пациент Иванов 3301 врач Петров", "777", "13.05.2026"],
      ]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      orderNumber: "3301",
      invoiceNumberRaw: "777",
      invoiceDate: "13.05.2026",
      paid: true,
      apply: true,
      errors: [],
    });
    expect(buildFinanceInvoiceNumber(rows[0]!.invoiceNumberRaw, rows[0]!.invoiceDate)).toBe(
      "Счет 777 от 13.05.2026",
    );
  });

  it("keeps unrecognized rows for human correction", () => {
    const rows = parseFinanceBankWorkbook(
      workbookBuffer([
        ["Оплата", "Ответственный", "Комментарий", "НОМЕР", "ДАТА"],
        ["Да", "ИП", "Пациент Иванов врач Петров", "778", "13.05.2026"],
      ]),
    );
    expect(rows[0]!.apply).toBe(false);
    expect(rows[0]!.errors.join(" ")).toContain("невозможно определить номер заказа");
  });

  it("normalizes manually corrected apply rows", () => {
    const row = normalizeFinanceBankApplyRow({
      sourceRow: 2,
      orderNumber: "3301",
      invoiceNumberRaw: "777",
      invoiceDate: "13/05/2026",
      paid: true,
      apply: true,
    });
    expect(row.errors).toEqual([]);
    expect(row.invoiceDate).toBe("13.05.2026");
  });

  it("does not apply rows without payment marker", () => {
    const rows = parseFinanceBankWorkbook(
      workbookBuffer([
        ["Оплата", "Ответственный", "Комментарий", "НОМЕР", "ДАТА"],
        ["", "ООО", "Пациент Иванов 3301 врач Петров", "777", "13.05.2026"],
      ]),
    );
    expect(rows[0]!.apply).toBe(false);
    expect(rows[0]!.errors.join(" ")).toContain("нет признака оплаты");
  });
});
