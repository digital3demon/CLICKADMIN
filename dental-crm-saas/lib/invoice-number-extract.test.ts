import { describe, expect, it } from "vitest";
import {
  extractInvoiceNumberFromDocumentText,
  extractInvoiceNumberFromFileName,
} from "./invoice-number-extract";

describe("extractInvoiceNumberFromFileName", () => {
  it("из типового имени файла", () => {
    expect(
      extractInvoiceNumberFromFileName(
        "Счет на оплату № 178 от 10.02.2026 (2).pdf",
      ),
    ).toBe("178");
  });

  it("вариант «счёт» и без пробела перед цифрами", () => {
    expect(
      extractInvoiceNumberFromFileName("Счёт на оплату №99 от 01.01.2026.pdf"),
    ).toBe("99");
  });

  it("паттерн «№ … от» без слова счёт", () => {
    expect(extractInvoiceNumberFromFileName("invoice № 42 от 2026.pdf")).toBe(
      "42",
    );
  });

  it("без номера — null", () => {
    expect(extractInvoiceNumberFromFileName("document.pdf")).toBeNull();
  });
});

describe("extractInvoiceNumberFromDocumentText", () => {
  it("заголовок как в PDF", () => {
    expect(
      extractInvoiceNumberFromDocumentText(
        "Счет на оплату № 178 от 10 февраля 2026 г.",
      ),
    ).toBe("178");
  });

  it("не выходит за предел сканирования", () => {
    const pad = "x".repeat(2000);
    expect(
      extractInvoiceNumberFromDocumentText(
        `${pad}\nСчёт на оплату № 7 от 1 марта 2026`,
        { maxScanChars: 800 },
      ),
    ).toBeNull();
    expect(
      extractInvoiceNumberFromDocumentText(
        `Счёт на оплату № 7 от 1 марта 2026\n${pad}`,
        { maxScanChars: 800 },
      ),
    ).toBe("7");
  });
});
