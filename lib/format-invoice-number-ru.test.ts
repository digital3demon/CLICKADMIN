import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildInvoiceCaptionRuFromDocumentText,
  buildInvoiceCaptionRuFromFileName,
  formatInvoiceListPillLabel,
  normalizeInvoiceNumberFieldRu,
} from "./format-invoice-number-ru";

describe("invoice caption RU", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("имя файла с датой dd.mm.yyyy", () => {
    expect(
      buildInvoiceCaptionRuFromFileName(
        "Счет на оплату № 178 от 10.02.2026 (2).pdf",
      ),
    ).toBe("№178 от 10 февраля 2026");
  });

  it("имя файла без даты — сегодня по Москве", () => {
    expect(
      buildInvoiceCaptionRuFromFileName("Счёт на оплату №7 от прочее.pdf"),
    ).toBe("№7 от 20 апреля 2026");
  });

  it("текст PDF с датой словами", () => {
    expect(
      buildInvoiceCaptionRuFromDocumentText(
        "Счет на оплату № 178 от 10 февраля 2026 г.",
      ),
    ).toBe("№178 от 10 февраля 2026");
  });

  it("normalize: только цифры", () => {
    expect(normalizeInvoiceNumberFieldRu("376")).toBe(
      "№376 от 20 апреля 2026",
    );
  });

  it("normalize: дата с точками", () => {
    expect(normalizeInvoiceNumberFieldRu("№376 от 10.02.2026")).toBe(
      "№376 от 10 февраля 2026",
    );
  });

  it("normalize: уже словами — канон", () => {
    expect(normalizeInvoiceNumberFieldRu("№ 99 от 1 января 2026")).toBe(
      "№99 от 1 января 2026",
    );
  });

  it("normalize: пусто — null", () => {
    expect(normalizeInvoiceNumberFieldRu("")).toBeNull();
    expect(normalizeInvoiceNumberFieldRu("  ")).toBeNull();
  });
});

describe("formatInvoiceListPillLabel", () => {
  it("пусто — СЧЕТ", () => {
    expect(formatInvoiceListPillLabel(null)).toBe("СЧЕТ");
    expect(formatInvoiceListPillLabel("")).toBe("СЧЕТ");
    expect(formatInvoiceListPillLabel("  ")).toBe("СЧЕТ");
  });

  it("только цифры — без даты", () => {
    expect(formatInvoiceListPillLabel("1320")).toBe("СЧЕТ №1320");
    expect(formatInvoiceListPillLabel("№376")).toBe("СЧЕТ №376");
  });

  it("канон БД: месяц словами → цифры в пилюле", () => {
    expect(formatInvoiceListPillLabel("№1320 от 9 июля 2026")).toBe(
      "СЧЕТ №1320 от 9.07.2026",
    );
  });

  it("кириллица до и после «от»", () => {
    expect(
      formatInvoiceListPillLabel("счёт перед №1320 от 9 июля 2026 после"),
    ).toBe("СЧЕТ №1320 от 9.07.2026");
  });

  it("дата уже точками", () => {
    expect(formatInvoiceListPillLabel("№376 от 10.02.2026")).toBe(
      "СЧЕТ №376 от 10.02.2026",
    );
  });

  it("импорт банка без знака №", () => {
    expect(formatInvoiceListPillLabel("Счет 777 от 10.02.2026")).toBe(
      "СЧЕТ №777 от 10.02.2026",
    );
  });
});
