import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { mergeInvoicePdfBuffers } from "@/lib/finance-office-merge-invoice-pdfs";

async function onePagePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  return doc.save();
}

describe("mergeInvoicePdfBuffers", () => {
  it("склеивает два PDF, кириллица только в имени файла снаружи", async () => {
    const a = await onePagePdf();
    const b = await onePagePdf();
    const merged = await mergeInvoicePdfBuffers([a, b]);
    const loaded = await PDFDocument.load(merged);
    expect(loaded.getPageCount()).toBe(2);
  });

  it("пропускает пустой буфер и всё равно склеивает валидные", async () => {
    const a = await onePagePdf();
    const merged = await mergeInvoicePdfBuffers([new Uint8Array(), a]);
    const loaded = await PDFDocument.load(merged);
    expect(loaded.getPageCount()).toBe(1);
  });
});
