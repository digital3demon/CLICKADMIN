import { describe, expect, it } from "vitest";
import {
  compositionItemsFromClientOrderText,
  compositionLinesFromClientOrderText,
  financeOfficeCompositionFromConstructions,
  formatFinanceOfficeCompositionLine,
} from "@/lib/finance-office-order-search";

describe("formatFinanceOfficeCompositionLine", () => {
  it("кириллица до и после названия позиции", () => {
    expect(
      formatFinanceOfficeCompositionLine({
        quantity: 2,
        name: "заказ Коронка E.max работа",
        shade: "A2",
      }),
    ).toBe("2× заказ Коронка E.max работа, A2");
  });

  it("одна штука без оттенка", () => {
    expect(
      formatFinanceOfficeCompositionLine({
        quantity: 1,
        name: "Вкладка",
        shade: "",
      }),
    ).toBe("Вкладка");
  });
});

describe("compositionLinesFromClientOrderText", () => {
  it("берёт первые непустые строки с кириллицей вокруг", () => {
    expect(
      compositionLinesFromClientOrderText(
        "шапка\n\nкоронка 16\nмост 11–13\nхвост не нужен\nещё",
      ),
    ).toEqual(["шапка", "коронка 16", "мост 11–13"]);
  });
});

describe("compositionItemsFromClientOrderText", () => {
  it("кириллица до и после строки состава, сумма неизвестна", () => {
    expect(
      compositionItemsFromClientOrderText("до\nСплинт сложный\nпосле"),
    ).toEqual([
      { title: "до", quantity: 1, amountRub: 0 },
      { title: "Сплинт сложный", quantity: 1, amountRub: 0 },
      { title: "после", quantity: 1, amountRub: 0 },
    ]);
  });
});

describe("financeOfficeCompositionFromConstructions", () => {
  it("прайс с кириллицей: код · имя, кол-во и сумма после скидки", () => {
    expect(
      financeOfficeCompositionFromConstructions(
        [
          {
            category: "PRICE_LIST",
            quantity: 2,
            unitPrice: 10000,
            lineDiscountPercent: 10,
            constructionTypeId: null,
            priceListItemId: "p1",
            materialId: null,
            shade: null,
            teethFdi: [],
            bridgeFromFdi: null,
            bridgeToFdi: null,
            arch: null,
          },
        ],
        {
          typeById: new Map(),
          materialById: new Map(),
          priceById: new Map([
            ["p1", { code: "1001", name: "Сплинт сложный" }],
          ]),
        },
      ),
    ).toEqual([
      { title: "1001 · Сплинт сложный", quantity: 2, amountRub: 18000 },
    ]);
  });
});
