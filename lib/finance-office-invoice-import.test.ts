import { describe, expect, it } from "vitest";
import {
  classifyFinanceOfficeDropFiles,
  financeOfficeInvoiceRowKey,
} from "@/lib/finance-office-invoice-import";

describe("classifyFinanceOfficeDropFiles", () => {
  it("PDF и ZIP — счета", () => {
    expect(
      classifyFinanceOfficeDropFiles([
        { name: "Счет_на_оплату_№_1646_от_20_августа_2026_г.pdf" },
        { name: "Счет_на_оплату_№_1639_от_20_августа_2026_г.zip" },
      ]).kind,
    ).toBe("invoices");
  });

  it("Excel — оплаты", () => {
    expect(classifyFinanceOfficeDropFiles([{ name: "bank.xlsx" }]).kind).toBe(
      "bank",
    );
  });

  it("смесь Excel и PDF", () => {
    expect(
      classifyFinanceOfficeDropFiles([
        { name: "bank.xlsx" },
        { name: "счет.pdf" },
      ]).kind,
    ).toBe("mixed");
  });
});

describe("financeOfficeInvoiceRowKey", () => {
  it("различает файлы из архива", () => {
    expect(financeOfficeInvoiceRowKey("a.pdf", "pack.zip")).toBe("pack.zip::a.pdf");
    expect(financeOfficeInvoiceRowKey("a.pdf", null)).toBe("::a.pdf");
  });
});
