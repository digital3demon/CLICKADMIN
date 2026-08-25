import { describe, expect, it } from "vitest";
import {
  classifyFinanceOfficePdfKind,
  resolveFinanceOfficePdfKind,
} from "@/lib/finance-office-pdf-kind";

describe("classifyFinanceOfficePdfKind", () => {
  it("имя счёта на оплату", () => {
    expect(
      classifyFinanceOfficePdfKind(
        "Счет_на_оплату_№_1643_от_20_августа_2026_г.pdf",
      ),
    ).toBe("invoice");
  });

  it("имя УПД с кириллицей вокруг номера", () => {
    expect(
      classifyFinanceOfficePdfKind(
        "УПД_статус_1_№_1654_от_20_августа_2026_г.pdf",
      ),
    ).toBe("upd");
  });

  it("текст счёт-фактура без «на оплату» — УПД", () => {
    expect(
      classifyFinanceOfficePdfKind(
        "doc.pdf",
        "Универсальный передаточный документ\nСчет-фактура № 1654 от 20 августа 2026 г.",
      ),
    ).toBe("upd");
  });

  it("неизвестный PDF в пачке — как счёт", () => {
    expect(resolveFinanceOfficePdfKind("scan.pdf", "")).toBe("invoice");
  });
});
