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
});
