/**
 * Маршрутизация дропа в фин. отделе: Excel/картинка = оплаты, PDF/ZIP/RAR/7z = счета.
 * Apply счетов: NDJSON phase/row/done — живой прогресс в модалке, не одно «Сохранение…».
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

export function isFinanceOfficeInvoiceArchive(file: FinanceOfficeDropFile): boolean {
  const ext = extOf(file.name);
  const mime = String(file.type || "").toLowerCase();
  if (ext === "zip" || ext === "rar" || ext === "7z") return true;
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) return true;
  return false;
}

export function isFinanceOfficeInvoiceFile(file: FinanceOfficeDropFile): boolean {
  const ext = extOf(file.name);
  const mime = String(file.type || "").toLowerCase();
  if (ext === "pdf" || mime.includes("pdf")) return true;
  return isFinanceOfficeInvoiceArchive(file);
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

/** Неуспех apply, который имеет смысл повторить (не «строка пропущена»). */
export function isFinanceInvoiceImportRetryable(
  result: Pick<FinanceInvoiceImportApplyResult, "ok" | "message">,
): boolean {
  if (result.ok) return false;
  if (result.message === "Строка пропущена") return false;
  return true;
}

export function filterInvoiceRowsForRetry<T extends { key: string }>(
  rows: readonly T[],
  results: readonly Pick<
    FinanceInvoiceImportApplyResult,
    "key" | "ok" | "message"
  >[],
): T[] {
  const failed = new Set(
    results.filter(isFinanceInvoiceImportRetryable).map((r) => r.key),
  );
  return rows.filter((r) => failed.has(r.key));
}

/** Имена файлов дропа, нужные для повторной загрузки только ошибочных строк. */
export function invoiceImportSourceFileNames(
  rows: readonly { fileName: string; sourceArchive: string | null }[],
): string[] {
  const names = new Set<string>();
  for (const r of rows) {
    const n = (r.sourceArchive || r.fileName).trim();
    if (n) names.add(n);
  }
  return [...names];
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

/** NDJSON-события POST /invoice-import/apply при Accept: application/x-ndjson. */
export type FinanceInvoiceImportProgressEvent =
  | { type: "phase"; phase: "unpack" | "attach" }
  | { type: "start"; total: number }
  | {
      type: "row";
      done: number;
      total: number;
      result: FinanceInvoiceImportApplyResult;
    }
  | {
      type: "done";
      results: FinanceInvoiceImportApplyResult[];
      applied: number;
      skipped: number;
    }
  | { type: "error"; error: string };

export function parseFinanceInvoiceImportProgressLine(
  line: string,
): FinanceInvoiceImportProgressEvent | null {
  const s = line.trim();
  if (!s) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(s);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const t = (raw as { type?: unknown }).type;
  if (
    t === "phase" ||
    t === "start" ||
    t === "row" ||
    t === "done" ||
    t === "error"
  ) {
    return raw as FinanceInvoiceImportProgressEvent;
  }
  return null;
}

export async function readFinanceInvoiceImportApplyResponse(
  res: Response,
  onEvent?: (ev: FinanceInvoiceImportProgressEvent) => void,
): Promise<FinanceInvoiceImportApplyResult[]> {
  const ctype = (res.headers.get("content-type") || "").toLowerCase();
  if (ctype.includes("ndjson")) {
    if (!res.body) throw new Error("Пустой ответ сервера");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let results: FinanceInvoiceImportApplyResult[] | null = null;
    let streamError: string | null = null;
    const takeLine = (line: string) => {
      const ev = parseFinanceInvoiceImportProgressLine(line);
      if (!ev) return;
      onEvent?.(ev);
      if (ev.type === "done") results = ev.results;
      if (ev.type === "error") streamError = ev.error;
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl = buf.indexOf("\n");
      while (nl >= 0) {
        takeLine(buf.slice(0, nl));
        buf = buf.slice(nl + 1);
        nl = buf.indexOf("\n");
      }
    }
    takeLine(buf);
    if (streamError) throw new Error(streamError);
    if (!results) throw new Error("Сервер не вернул результат");
    return results;
  }

  const data = (await res.json().catch(() => ({}))) as {
    results?: FinanceInvoiceImportApplyResult[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || "Не удалось прикрепить счета");
  return Array.isArray(data.results) ? data.results : [];
}
