/**
 * Склейка PDF счетов выбранных нарядов ФинОтдела.
 * Timezone не используется. Битый PDF пропускаем — остальные печатаем.
 */
import { PDFDocument } from "pdf-lib";
import { FINANCE_OFFICE_INVOICE_PRINT_MAX } from "@/lib/finance-office-invoice-print-limit";

export { FINANCE_OFFICE_INVOICE_PRINT_MAX };

export async function mergeInvoicePdfBuffers(
  buffers: readonly Uint8Array[],
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  let added = 0;
  for (const buf of buffers) {
    if (!buf?.byteLength) continue;
    try {
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      for (const page of pages) out.addPage(page);
      added += pages.length;
    } catch {
      /* один битый файл не роняет пачку */
    }
  }
  if (added === 0) {
    throw new Error("Нет страниц для печати");
  }
  return out.save();
}
