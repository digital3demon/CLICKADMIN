import { describe, expect, it } from "vitest";
import {
  extractContractNumberFromDocumentText,
  formatContractNumber,
  formatYearMonthYYMM,
  parseGeneratedContractNumber,
} from "./clinic-contract";

describe("contract number format", () => {
  it("формирует YYMM-NNN", () => {
    expect(formatYearMonthYYMM(new Date("2026-05-10T00:00:00Z"))).toBe("2605");
    expect(formatContractNumber("2605", 2)).toBe("2605-002");
  });

  it("парсит только канонический формат", () => {
    expect(parseGeneratedContractNumber("2605-004")).toEqual({
      yearMonth: "2605",
      sequence: 4,
    });
    expect(parseGeneratedContractNumber(" 2605-004 ")).toEqual({
      yearMonth: "2605",
      sequence: 4,
    });
    expect(parseGeneratedContractNumber("26-5-4")).toBeNull();
  });
});

describe("extractContractNumberFromDocumentText", () => {
  it("находит номер в шапке договора", () => {
    const text = 'Типовой текст ... ДОГОВОР № 2605-014 поставки зуботехнических работ';
    expect(extractContractNumberFromDocumentText(text)).toBe("2605-014");
  });

  it("работает, когда вокруг есть кириллица до и после", () => {
    const text =
      "Преамбула для клиники Альфа.\nООО Ромашка заключили договор № АБ-77/2026 от 10.05.2026, реквизиты сторон ниже.";
    expect(extractContractNumberFromDocumentText(text)).toBe("АБ-77/2026");
  });

  it("возвращает null на пустом вводе", () => {
    expect(extractContractNumberFromDocumentText("")).toBeNull();
  });
});
