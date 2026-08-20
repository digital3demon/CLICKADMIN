/**
 * Распаковка архивов со счетами: ZIP (и ZIP с чужим расширением).
 * RAR/7z принимаем на входе; если это не ZIP — просим пересохранить.
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

function looksLikeZipBytes(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b;
}

function archiveKind(name: string, mime: string): "zip" | "rar" | "7z" | "pdf" | "other" {
  const lower = name.toLowerCase();
  const m = mime.toLowerCase();
  if (lower.endsWith(".pdf") || m.includes("pdf")) return "pdf";
  if (lower.endsWith(".zip") || m.includes("zip")) return "zip";
  if (lower.endsWith(".rar") || m.includes("rar")) return "rar";
  if (lower.endsWith(".7z") || m.includes("7z")) return "7z";
  return "other";
}

async function pdfsFromZipBuffer(
  buf: Buffer,
  archiveName: string,
  into: ExpandedInvoicePdf[],
): Promise<string | null> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    return `Не удалось открыть архив: ${archiveName}`;
  }
  const entries = Object.values(zip.files).filter((entry) => {
    if (entry.dir) return false;
    if (isMacJunkPath(entry.name)) return false;
    return entry.name.toLowerCase().endsWith(".pdf");
  });
  for (const entry of entries) {
    const bytes = Buffer.from(await entry.async("uint8array"));
    into.push({
      fileName: basenamePath(entry.name) || entry.name,
      sourceArchive: archiveName,
      buf: bytes,
    });
    if (into.length > FINANCE_INVOICE_IMPORT_MAX_PDFS) {
      return `Слишком много PDF в пакете, максимум ${FINANCE_INVOICE_IMPORT_MAX_PDFS}`;
    }
  }
  return null;
}

export async function expandFinanceInvoiceUploadFiles(
  files: Array<{ name: string; mime: string; buf: Buffer }>,
): Promise<{ pdfs: ExpandedInvoicePdf[]; error: string | null }> {
  const pdfs: ExpandedInvoicePdf[] = [];
  for (const file of files) {
    const kind = archiveKind(file.name, file.mime);
    if (kind === "zip" || kind === "rar" || kind === "7z") {
      if (!looksLikeZipBytes(file.buf) && (kind === "rar" || kind === "7z")) {
        return {
          pdfs: [],
          error: `${file.name}: RAR и 7z сохраните как ZIP (или положите PDF)`,
        };
      }
      const err = await pdfsFromZipBuffer(file.buf, file.name, pdfs);
      if (err) return { pdfs: [], error: err };
      continue;
    }
    if (kind === "pdf") {
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
