/**
 * Распаковка ZIP со счетами: только вложенные PDF.
 */

import JSZip from "jszip";

export const FINANCE_INVOICE_IMPORT_MAX_PDFS = 30;
export const FINANCE_INVOICE_IMPORT_MAX_FILE_BYTES = 20 * 1024 * 1024;

export type ExpandedInvoicePdf = {
  fileName: string;
  sourceArchive: string | null;
  buf: Buffer;
};

function basenamePath(p: string): string {
  const norm = p.replace(/\\/g, "/");
  const i = norm.lastIndexOf("/");
  return i >= 0 ? norm.slice(i + 1) : norm;
}

function isMacJunkPath(name: string): boolean {
  const n = name.replace(/\\/g, "/");
  if (n.startsWith("__MACOSX/") || n.includes("/__MACOSX/")) return true;
  const base = basenamePath(n);
  return base.startsWith(".") || base === "Thumbs.db";
}

export async function expandFinanceInvoiceUploadFiles(
  files: Array<{ name: string; mime: string; buf: Buffer }>,
): Promise<{ pdfs: ExpandedInvoicePdf[]; error: string | null }> {
  const pdfs: ExpandedInvoicePdf[] = [];
  for (const file of files) {
    const lower = file.name.toLowerCase();
    const mime = file.mime.toLowerCase();
    if (lower.endsWith(".zip") || mime.includes("zip")) {
      let zip: JSZip;
      try {
        zip = await JSZip.loadAsync(file.buf);
      } catch {
        return { pdfs: [], error: `Не удалось открыть архив: ${file.name}` };
      }
      const entries = Object.values(zip.files).filter((entry) => {
        if (entry.dir) return false;
        if (isMacJunkPath(entry.name)) return false;
        return entry.name.toLowerCase().endsWith(".pdf");
      });
      for (const entry of entries) {
        const buf = Buffer.from(await entry.async("uint8array"));
        pdfs.push({
          fileName: basenamePath(entry.name) || entry.name,
          sourceArchive: file.name,
          buf,
        });
        if (pdfs.length > FINANCE_INVOICE_IMPORT_MAX_PDFS) {
          return {
            pdfs: [],
            error: `Слишком много PDF в пакете, максимум ${FINANCE_INVOICE_IMPORT_MAX_PDFS}`,
          };
        }
      }
      continue;
    }
    if (lower.endsWith(".pdf") || mime.includes("pdf")) {
      pdfs.push({
        fileName: file.name,
        sourceArchive: null,
        buf: file.buf,
      });
      if (pdfs.length > FINANCE_INVOICE_IMPORT_MAX_PDFS) {
        return {
          pdfs: [],
          error: `Слишком много PDF в пакете, максимум ${FINANCE_INVOICE_IMPORT_MAX_PDFS}`,
        };
      }
    }
  }
  if (pdfs.length === 0) {
    return { pdfs: [], error: "В файлах нет PDF счетов" };
  }
  return { pdfs, error: null };
}
