import "server-only";

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

  const PDF_PARSE_BUDGET_MS = 14_000;
  let text = "";
  try {
    text = await Promise.race([
      (async () => {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: buf });
        try {
          const textResult = await parser.getText({ first: 5 });
          return textResult?.text ?? "";
        } finally {
          await parser.destroy().catch(() => {});
        }
      })(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("PDF_PARSE_TIMEOUT")), PDF_PARSE_BUDGET_MS),
      ),
    ]);
  } catch (e) {
    warnings.push(
      e instanceof Error && e.message === "PDF_PARSE_TIMEOUT"
        ? "Разбор PDF прерван по таймауту"
        : "Не удалось извлечь текст из PDF",
    );
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
