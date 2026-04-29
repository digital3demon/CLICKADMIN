import "server-only";

import { buildInvoiceCaptionRuFromDocumentText } from "@/lib/format-invoice-number-ru";
import { isProbablyPdf } from "@/lib/invoice-number-extract";

/**
 * Текст первой страницы PDF и подпись счёта «№… от …» (если номер найден).
 */
export async function extractInvoiceNumberFromPdfBuffer(
  buf: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string | null> {
  if (!isProbablyPdf(mimeType, fileName)) return null;
  if (buf.length < 8) return null;

  const PDF_PARSE_BUDGET_MS = 12_000;

  try {
    const parsed = await Promise.race([
      (async () => {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: buf });
        try {
          const textResult = await parser.getText({ first: 1 });
          const text = textResult?.text ?? "";
          return buildInvoiceCaptionRuFromDocumentText(text);
        } finally {
          await parser.destroy().catch(() => {});
        }
      })(),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), PDF_PARSE_BUDGET_MS),
      ),
    ]);
    return parsed;
  } catch (e) {
    console.warn("[extractInvoiceNumberFromPdfBuffer]", e);
    return null;
  }
}
