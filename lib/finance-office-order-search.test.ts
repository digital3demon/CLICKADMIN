import { describe, expect, it } from "vitest";
import {
  compositionLinesFromClientOrderText,
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
