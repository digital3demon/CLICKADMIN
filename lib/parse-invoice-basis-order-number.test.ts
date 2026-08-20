import { describe, expect, it } from "vitest";
import { extractInvoiceNumberFromFileName } from "@/lib/invoice-number-extract";
import {
  extractOrderNumberFromInvoiceBasisText,
  formatInvoiceBasisFoundLabel,
  invoiceFileNameForNumberExtract,
} from "@/lib/parse-invoice-basis-order-number";

describe("extractOrderNumberFromInvoiceBasisText", () => {
  it("берёт наряд перед фамилиями, не номер до «от»", () => {
    expect(
      extractOrderNumberFromInvoiceBasisText(
        "оплата лаборатории Основание: 2405-017 от 28.05.2024 2608-080 Поздеева Аветисян А.С. дальше текст",
      ),
    ).toBe("2608-080");
  });

  it("не берёт номер договора после «Договор №»", () => {
    expect(
      extractOrderNumberFromInvoiceBasisText(
        "шапка Основание: Договор № 2408-003 от 20.08.2024 2608-226 Марченко Зубарев С.В. итог",
      ),
    ).toBe("2608-226");
  });

  it("латиница в OCHOBание и «Без договора»", () => {
    expect(
      extractOrderNumberFromInvoiceBasisText(
        "OCHOBание:\n Без договора 2608-211 Успенский А.Д. Носкова Д.А. сумма",
      ),
    ).toBe("2608-211");
  });

  it("типовой ClickLAB: договор + наряд и фамилии", () => {
    expect(
      extractOrderNumberFromInvoiceBasisText(
        "Счет на оплату № 1014 от 01 июня 2026 г.\nОснование: Договор №2603-011 от 24.03.26 / 2605-401 Карпова О. Петрова С.М.",
      ),
    ).toBe("2605-401");
  });

  it("пустой ввод", () => {
    expect(extractOrderNumberFromInvoiceBasisText("")).toBeNull();
    expect(extractOrderNumberFromInvoiceBasisText("   ")).toBeNull();
  });

  it("только договор без наряда — null", () => {
    expect(
      extractOrderNumberFromInvoiceBasisText(
        "Основание: Договор № 2408-003 от 20.08.2024",
      ),
    ).toBeNull();
  });
});

describe("formatInvoiceBasisFoundLabel", () => {
  it("оставляет Основание и наряд, отрезает таблицу товаров", () => {
    expect(
      formatInvoiceBasisFoundLabel(
        "шапка счёта Основание: 2405-017 от 28.05.2024 2608-080 Поздеева Аветисян А.С. № Товары (работы, услуги) Кол-во Ед. Цена Сумма 1 -1001 Сплинт сложный",
      ),
    ).toBe(
      "Основание: 2405-017 от 28.05.2024 2608-080 Поздеева Аветисян А.С.",
    );
  });

  it("кириллица до и после, договор в основании", () => {
    expect(
      formatInvoiceBasisFoundLabel(
        "Счет на оплату Основание: Договор № 2408-003 от 20.08.2024; 2608-213 Анисова М. Зубарев С.В. № Товары (работы, услуги) Кол-во Ед.",
      ),
    ).toBe(
      "Основание: Договор № 2408-003 от 20.08.2024; 2608-213 Анисова М. Зубарев С.В.",
    );
  });

  it("пустой ввод", () => {
    expect(formatInvoiceBasisFoundLabel("")).toBe("");
    expect(formatInvoiceBasisFoundLabel("   ")).toBe("");
  });
});

describe("invoiceFileNameForNumberExtract", () => {
  it("подчёркивания как в выгрузке iMe", () => {
    const pretty = invoiceFileNameForNumberExtract(
      "Счет_на_оплату_№_1646_от_20_августа_2026_г.pdf",
    );
    expect(pretty).toBe("Счет на оплату № 1646 от 20 августа 2026 г.pdf");
    expect(extractInvoiceNumberFromFileName(pretty)).toBe("1646");
  });
});
