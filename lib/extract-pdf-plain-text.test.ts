import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractPdfPlainText } from "@/lib/extract-pdf-plain-text";
import { extractOrderNumberFromInvoiceBasisText } from "@/lib/parse-invoice-basis-order-number";

const INVOICE_1646 =
  "C:/Users/sevas/Downloads/iMe Desktop/Счет_на_оплату_№_1646_от_20_августа_2026_г.pdf";

/** Минимальный PDF 1.4 с латиницей (pdf.js не требует xref-идеала, но ставим). */
function minimalPdfWithText(text: string): Buffer {
  const esc = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const content = `BT /F1 12 Tf 72 720 Td (${esc}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xrefPos = body.length;
  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `${xref}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}

describe("extractPdfPlainText", () => {
  it("минимальный PDF: 2608-080 перед фамилией", async () => {
    const r = await extractPdfPlainText(
      minimalPdfWithText("2405-017 ot 28.05.2024 2608-080 Pozdeeva"),
    );
    expect(r.error).toBeNull();
    expect(extractOrderNumberFromInvoiceBasisText(r.text)).toBe("2608-080");
  });

  it("счёт 1646: Основание → 2608-080 Поздеева", async () => {
    if (!existsSync(INVOICE_1646)) return;
    const r = await extractPdfPlainText(readFileSync(INVOICE_1646));
    expect(r.error).toBeNull();
    expect(r.text).toMatch(/Основание/i);
    expect(extractOrderNumberFromInvoiceBasisText(r.text)).toBe("2608-080");
  });
});
