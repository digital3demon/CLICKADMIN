import { describe, expect, it } from "vitest";
import {
  extractOrderNumberFromSearchQuery,
  foldOrderSearchText,
  orderSearchContainsNeedle,
  orderSearchPrismaNeedles,
  orderSearchSignificantTokens,
  textMatchesOrderSearch,
} from "@/lib/order-search-query";

describe("extractOrderNumberFromSearchQuery", () => {
  it("достаёт YYMM-NNN при кириллице до и после", () => {
    expect(
      extractOrderNumberFromSearchQuery(
        "до 2608-325 Загоскина Я. Самус Н. Э. после",
      ),
    ).toBe("2608-325");
  });

  it("нормализует тире из «скопировать все»", () => {
    expect(
      extractOrderNumberFromSearchQuery(
        "2608–325 Загоскина Я.\nООО «ДИНАСТИЯ»\n1101178144",
      ),
    ).toBe("2608-325");
  });

  it("без номера возвращает null", () => {
    expect(extractOrderNumberFromSearchQuery("Загоскина Я. Самус")).toBeNull();
  });
});

describe("orderSearchSignificantTokens", () => {
  it("оставляет номер и фамилии, отбрасывает инициалы с точками", () => {
    expect(
      orderSearchSignificantTokens("2608-325 Загоскина Я. Самус Н. Э."),
    ).toEqual([
      foldOrderSearchText("2608-325"),
      foldOrderSearchText("загоскина"),
      foldOrderSearchText("самус"),
    ]);
  });
});

describe("textMatchesOrderSearch", () => {
  it("вставка названия находит работу, даже если в стоге «Н.Э.» без пробелов", () => {
    expect(
      textMatchesOrderSearch(
        "Загоскина Я. Самус Н.Э. Сплинт 28.08\n2608-325",
        "2608-325 Загоскина Я. Самус Н. Э.",
      ),
    ).toBe(true);
  });

  it("без номера в стоге находит по фамилиям из строки документооборота", () => {
    expect(
      textMatchesOrderSearch(
        "пациент Загоскина Яна врач Самус Николай Эдуардович",
        "Загоскина Я. Самус Н. Э.",
      ),
    ).toBe(true);
  });

  it("не матчит чужую фамилию без номера", () => {
    expect(
      textMatchesOrderSearch("Петров И. Сплинт", "Загоскина Я. Самус Н. Э."),
    ).toBe(false);
  });
});

describe("orderSearchContainsNeedle", () => {
  it("для вставки из документооборота даёт номер наряда", () => {
    expect(
      orderSearchContainsNeedle("2608-325 Загоскина Я. Самус Н. Э."),
    ).toBe("2608-325");
  });
});

describe("orderSearchPrismaNeedles", () => {
  it("не тащит юрлицо и ИНН из «скопировать все»", () => {
    expect(
      orderSearchPrismaNeedles(
        "2608-325 Загоскина Я. Самус Н. Э.\nООО «ДИНАСТИЯ СТОМ»\n1101178144",
      ),
    ).toEqual(["2608-325"]);
  });
});
