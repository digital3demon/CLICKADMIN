import "server-only";

import { extractPdfPlainText } from "@/lib/extract-pdf-plain-text";
import { isProbablyPdf } from "@/lib/invoice-number-extract";
import {
  parseInvoiceExtractedText,
  type ParseInvoicePdfResult,
} from "@/lib/parse-invoice-extracted-text";

export type { ParseInvoicePdfResult };
export {
  extractLinesFromRuInvoiceTable,
  extractTotalRub,
  parseIntRu,
  parseInvoiceExtractedText,
} from "@/lib/parse-invoice-extracted-text";

/** Текст первых страниц PDF счёта (таймаут как у разбора позиций). */
export async function extractInvoicePdfText(
  buf: Buffer,
): Promise<{ text: string; error: string | null }> {
  return extractPdfPlainText(buf);
}

/**
 * Извлекает из PDF счёта позиции и сумму (эвристики; не все макеты).
 */
export async function parseInvoicePdfBuffer(
  buf: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ParseInvoicePdfResult> {
  const warnings: string[] = [];
  if (!isProbablyPdf(mimeType, fileName)) {
    return {
      lines: [],
      totalRub: null,
      summaryText: "",
      warnings: ["Файл не похож на PDF — разбор не выполнен"],
      suggestedInvoiceNumber: null,
    };
  }
  if (buf.length < 16) {
    return {
      lines: [],
      totalRub: null,
      summaryText: "",
      warnings: ["Пустой или слишком короткий файл"],
      suggestedInvoiceNumber: null,
    };
  }

  const extracted = await extractInvoicePdfText(buf);
  const text = extracted.text;
  if (extracted.error) {
    warnings.push(extracted.error);
    return {
      lines: [],
      totalRub: null,
      summaryText: "",
      warnings,
      suggestedInvoiceNumber: null,
    };
  }

  if (!text.trim()) {
    warnings.push("В PDF не найден текст (возможно, скан без OCR)");
    return {
      lines: [],
      totalRub: null,
      summaryText: "",
      warnings,
      suggestedInvoiceNumber: null,
    };
  }

  const parsed = parseInvoiceExtractedText(text, { fileName });
  return {
    ...parsed,
    warnings: [...parsed.warnings, ...warnings],
  };
}
