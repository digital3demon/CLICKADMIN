/**
 * Маршрутизация дропа в фин. отделе: Excel/картинка = оплаты, PDF/ZIP = счета.
 */

export type FinanceOfficeDropKind = "bank" | "invoices" | "mixed" | "empty" | "unknown";

export type FinanceOfficeDropFile = { name: string; type?: string };

function extOf(name: string): string {
  const n = name.trim().toLowerCase();
  const i = n.lastIndexOf(".");
  return i >= 0 ? n.slice(i + 1) : "";
}

export function isFinanceOfficeBankFile(file: FinanceOfficeDropFile): boolean {
  const ext = extOf(file.name);
  const mime = String(file.type || "").toLowerCase();
  if (ext === "xls" || ext === "xlsx") return true;
  if (mime.startsWith("image/")) return true;
  if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp") return true;
  return false;
}

export function isFinanceOfficeInvoiceFile(file: FinanceOfficeDropFile): boolean {
  const ext = extOf(file.name);
  const mime = String(file.type || "").toLowerCase();
  if (ext === "pdf" || mime.includes("pdf")) return true;
  if (ext === "zip" || mime.includes("zip")) return true;
  return false;
}

export function classifyFinanceOfficeDropFiles(
  files: readonly FinanceOfficeDropFile[],
): { kind: FinanceOfficeDropKind; bankCount: number; invoiceCount: number } {
  if (!files.length) return { kind: "empty", bankCount: 0, invoiceCount: 0 };
  let bankCount = 0;
  let invoiceCount = 0;
  let other = 0;
  for (const f of files) {
    const bank = isFinanceOfficeBankFile(f);
    const inv = isFinanceOfficeInvoiceFile(f);
    if (bank) bankCount += 1;
    else if (inv) invoiceCount += 1;
    else other += 1;
  }
  if (bankCount > 0 && invoiceCount > 0) {
    return { kind: "mixed", bankCount, invoiceCount };
  }
  if (invoiceCount > 0 && bankCount === 0) {
    return { kind: "invoices", bankCount, invoiceCount };
  }
  if (bankCount > 0 && invoiceCount === 0) {
    return { kind: "bank", bankCount, invoiceCount };
  }
  return { kind: "unknown", bankCount: 0, invoiceCount: 0 };
}

export function financeOfficeInvoiceRowKey(
  fileName: string,
  sourceArchive: string | null,
): string {
  return `${sourceArchive ?? ""}::${fileName}`;
}

export type FinanceInvoiceImportPreviewRow = {
  key: string;
  fileName: string;
  sourceArchive: string | null;
  invoiceNumberRaw: string;
  orderNumber: string;
  orderId: string | null;
  orderLabel: string | null;
  alreadyHasInvoice: boolean;
  apply: boolean;
  errors: string[];
  basisSnippet: string;
};

export type FinanceInvoiceImportApplyRow = {
  key: string;
  fileName: string;
  sourceArchive: string | null;
  orderNumber: string;
  invoiceNumberRaw: string;
  apply: boolean;
};

export type FinanceInvoiceImportApplyResult = {
  key: string;
  orderNumber: string;
  ok: boolean;
  message: string;
};
