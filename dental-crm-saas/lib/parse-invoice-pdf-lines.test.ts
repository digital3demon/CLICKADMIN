import { describe, expect, it } from "vitest";
import {
  extractLinesFromRuInvoiceTable,
  extractTotalRub,
  parseIntRu,
  parseInvoiceExtractedText,
} from "./parse-invoice-extracted-text";

const SAMPLE_CLICKLAB = `
Счет на оплату № 733 от 21 апреля 2026 г.
Поставщик ООО "КЛИКЛАБ"

№ Товары (работы, услуги) Кол-во Ед. Цена Сумма
1 -1001 Сплинт сложный 1 шт 18 095,24 18 095,24
2 -2008 Просмотр исследования КЛКТ/МСКТ 1 шт 3 333,33 3 333,33
Итого 21 428,57
Сумма НДС 5% 1 071,43
Всего к оплате 22 500,00
Всего наименований 2, на сумму 22 500,00 руб.
Двадцать две тысячи пятьсот рублей 00 копеек
`;

describe("parseIntRu", () => {
  it("пробелы в тысячах и запятая в копейках", () => {
    expect(parseIntRu("22 500,00")).toBe(22500);
    expect(parseIntRu("18 095,24")).toBe(18095);
  });
});

describe("extractTotalRub", () => {
  it("берёт «Всего к оплате», а не промежуточное «Итого»", () => {
    expect(extractTotalRub(SAMPLE_CLICKLAB)).toBe(22500);
  });
});

describe("extractLinesFromRuInvoiceTable", () => {
  it("PDF разорвал строку: наименование и «1 шт …» на двух строках", () => {
    const split = `
№ Товары (работы, услуги) Кол-во Ед. Цена Сумма
1 -1001 Сплинт сложный
1 шт 18 095,24 18 095,24
2 -2008 Просмотр КЛКТ
1 шт 3 333,33 3 333,33
Итого 21 428,57
Всего к оплате 22 500,00
`;
    const lines = extractLinesFromRuInvoiceTable(split);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines.find((l) => l.code === "-1001")).toMatchObject({
      name: "Сплинт сложный",
      lineTotalRub: 18095,
    });
  });

  it("таблица одной строкой без переводов (как после склейки PDF)", () => {
    const oneLine = `Счёт №1
№ Товары (работы, услуги) Кол-во Ед. Цена Сумма 1 -1001 Коронка 2 шт 5 000,00 10 000,00
Итого 10 000,00
Всего к оплате 10 000,00
`;
    const lines = extractLinesFromRuInvoiceTable(oneLine);
    expect(lines.some((l) => l.name.includes("Коронка") && l.qty === 2)).toBe(
      true,
    );
  });

  it("две позиции с кодом артикула и суммой строки", () => {
    const lines = extractLinesFromRuInvoiceTable(SAMPLE_CLICKLAB);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      code: "-1001",
      name: "Сплинт сложный",
      qty: 1,
      lineTotalRub: 18095,
    });
    expect(lines[1]).toMatchObject({
      code: "-2008",
      name: "Просмотр исследования КЛКТ/МСКТ",
      qty: 1,
      lineTotalRub: 3333,
    });
  });
});

describe("parseInvoiceExtractedText", () => {
  it("сводка для «ВЫСТАВЛЕНО»: только код и наименование по строкам; сумма отдельно", () => {
    const r = parseInvoiceExtractedText(SAMPLE_CLICKLAB, {
      fileName: "bill.pdf",
    });
    expect(r.totalRub).toBe(22500);
    expect(r.lines).toHaveLength(2);
    expect(r.suggestedInvoiceNumber).toBe("733");
    expect(r.summaryText).toBe(
      "-1001 · Сплинт сложный\n-2008 · Просмотр исследования КЛКТ/МСКТ",
    );
    expect(r.summaryText).not.toMatch(/Всего к оплате|наименований|рублей/i);
  });
});
