import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { expandFinanceInvoiceUploadFiles } from "@/lib/finance-office-invoice-zip";

describe("expandFinanceInvoiceUploadFiles", () => {
  it("достаёт PDF из ZIP и игнорирует мусор macOS", async () => {
    const zip = new JSZip();
    zip.file("Счет_на_оплату_№_1639.pdf", "%PDF-1.4 fake");
    zip.file("__MACOSX/._junk", "xx");
    const buf = Buffer.from(await zip.generateAsync({ type: "uint8array" }));
    const r = await expandFinanceInvoiceUploadFiles([
      { name: "pack.zip", mime: "application/zip", buf },
    ]);
    expect(r.error).toBeNull();
    expect(r.pdfs).toHaveLength(1);
    expect(r.pdfs[0]?.fileName).toBe("Счет_на_оплату_№_1639.pdf");
    expect(r.pdfs[0]?.sourceArchive).toBe("pack.zip");
  });

  it("ZIP с расширением .rar (магические PK) всё равно распаковывается", async () => {
    const zip = new JSZip();
    zip.file("счет.pdf", "%PDF-1.4 fake");
    const buf = Buffer.from(await zip.generateAsync({ type: "uint8array" }));
    const r = await expandFinanceInvoiceUploadFiles([
      { name: "pack.rar", mime: "application/vnd.rar", buf },
    ]);
    expect(r.error).toBeNull();
    expect(r.pdfs[0]?.fileName).toBe("счет.pdf");
  });

  it("настоящий RAR без ZIP-заголовка — понятная ошибка", async () => {
    const buf = Buffer.from("Rar!\x1a\x07\x00not-a-zip");
    const r = await expandFinanceInvoiceUploadFiles([
      { name: "счета.rar", mime: "application/vnd.rar", buf },
    ]);
    expect(r.pdfs).toHaveLength(0);
    expect(r.error).toMatch(/ZIP/i);
  });
});
