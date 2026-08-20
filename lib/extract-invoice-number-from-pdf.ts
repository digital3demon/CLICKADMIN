import "server-only";

import { extractPdfPlainText } from "@/lib/extract-pdf-plain-text";
import { buildInvoiceCaptionRuFromDocumentText } from "@/lib/format-invoice-number-ru";
import { isProbablyPdf } from "@/lib/invoice-number-extract";

/**
 * Текст PDF и подпись счёта «№… от …» (если номер найден).
 */
export async function extractInvoiceNumberFromPdfBuffer(
  buf: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string | null> {
  if (!isProbablyPdf(mimeType, fileName)) return null;
  if (buf.length < 8) return null;
  const extracted = await extractPdfPlainText(buf);
  if (extracted.error || !extracted.text.trim()) return null;
  return buildInvoiceCaptionRuFromDocumentText(extracted.text);
}
