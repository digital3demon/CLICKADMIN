import { describe, expect, it } from "vitest";
import {
  formatInvoiceTotalRubRuDisplay,
  parseInvoiceTotalRubRuInput,
} from "./format-invoice-total-rub-display";

describe("formatInvoiceTotalRubRuDisplay", () => {
  it("группы тысяч и символ рубля", () => {
    expect(formatInvoiceTotalRubRuDisplay(22500)).toBe("22 500 ₽");
    expect(formatInvoiceTotalRubRuDisplay(18095)).toBe("18 095 ₽");
  });
});

describe("parseInvoiceTotalRubRuInput", () => {
  it("читает тот же формат и голые цифры", () => {
    expect(parseInvoiceTotalRubRuInput("22 500 ₽")).toBe(22500);
    expect(parseInvoiceTotalRubRuInput("22500")).toBe(22500);
    expect(parseInvoiceTotalRubRuInput("")).toBe(null);
    expect(parseInvoiceTotalRubRuInput("   ")).toBe(null);
  });
});
