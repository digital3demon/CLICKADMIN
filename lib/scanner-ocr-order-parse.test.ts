import { describe, expect, it } from "vitest";
import {
  extractOrderNumbersFromOcrText,
  pickBestOrderNumberFromOcr,
  pickKaitenCardIdFromOcr,
} from "@/lib/scanner-ocr-order-parse";

describe("extractOrderNumbersFromOcrText", () => {
  it("находит номер в заголовке с кириллицей до и после", () => {
    const raw =
      "занёс: Оля\n2607-422 Гордиенко А.В. Егорова О.К. Ретенционная каппа 05.08";
    expect(extractOrderNumbersFromOcrText(raw)).toEqual(["2607-422"]);
  });

  it("пусто → []", () => {
    expect(extractOrderNumbersFromOcrText("")).toEqual([]);
    expect(extractOrderNumbersFromOcrText("Гордиенко без номера")).toEqual([]);
  });

  it("несколько номеров — все уникальные", () => {
    const raw = "2607-353 Чирухина … см. также 2607-366 Комягинская";
    expect(extractOrderNumbersFromOcrText(raw)).toEqual([
      "2607-353",
      "2607-366",
    ]);
  });

  it("допускает пробелы вокруг тире (OCR)", () => {
    expect(
      extractOrderNumbersFromOcrText(
        "2608 - 001 Журова Карпенко М.В. Каппа рет. 05.08",
      ),
    ).toEqual(["2608-001"]);
  });
});

describe("pickBestOrderNumberFromOcr", () => {
  it("берёт первый (заголовок) при нескольких", () => {
    expect(
      pickBestOrderNumberFromOcr(
        "2607-390 Шаповалова А. Перчак\nв тексте случайно 1999-001",
      ),
    ).toBe("2607-390");
  });
});

describe("pickKaitenCardIdFromOcr", () => {
  it("достаёт id из URL kaiten в OCR", () => {
    expect(
      pickKaitenCardIdFromOcr(
        "https://clicklab.kaiten.ru/68081570\nШаповалова",
      ),
    ).toBe(68081570);
  });

  it("достаёт ID с распечатки карточки Kaiten", () => {
    expect(
      pickKaitenCardIdFromOcr(
        "2608-001 Журова\nID 68218911\nТип ОртоАппараты",
      ),
    ).toBe(68218911);
  });
});
