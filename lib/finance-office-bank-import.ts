import * as XLSX from "xlsx";

export type FinanceBankImportParsedRow = {
  sourceRow: number;
  originalText: string;
  orderNumber: string;
  invoiceNumberRaw: string;
  dateRaw: string;
  invoiceDate: string;
  paid: boolean;
  apply: boolean;
  errors: string[];
};

export type FinanceBankImportApplyRow = {
  sourceRow?: unknown;
  orderNumber?: unknown;
  invoiceNumberRaw?: unknown;
  invoiceDate?: unknown;
  paid?: unknown;
  apply?: unknown;
};

const REQUIRED_HEADER_ALIASES = {
  payment: ["оплата"],
  responsible: ["ответственный", "отвественный"],
  comment: ["комментарий", "комментарии"],
  invoiceNumber: ["номер", "№"],
  date: ["дата"],
} as const;

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toLocaleDateString("ru-RU");
  return String(value).replace(/\s+/g, " ").trim();
}

function isPaymentMarked(value: unknown): boolean {
  const text = cellText(value).toLowerCase();
  if (!text) return false;
  if (["0", "нет", "false", "ложь", "-"].includes(text)) return false;
  return true;
}

export function extractOrderNumberFromBankComment(comment: string): string {
  // JS \b не считает кириллицу словесными символами, поэтому используем явные unicode-границы.
  // Сначала ищем новый номер наряда вида 2605-060: он часто стоит внутри длинного
  // банковского комментария рядом с датами, суммами и номерами счетов.
  const dashedMatch = comment.match(/(?:^|[^\p{L}\p{N}])(\d{4}\s*-\s*\d{3})(?=$|[^\p{L}\p{N}])/u);
  if (dashedMatch?.[1]) return dashedMatch[1].replace(/\s*-\s*/g, "-");
  const match = comment.match(/(?:^|[^\p{L}\p{N}])(\d{3,8})(?=$|[^\p{L}\p{N}])/u);
  return match?.[1] ?? "";
}

function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const parsed = XLSX.SSF.parse_date_code(serial);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
}

export function normalizeBankDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString("ru-RU");
  }
  if (typeof value === "number") {
    const d = excelSerialToDate(value);
    return d ? d.toLocaleDateString("ru-RU") : "";
  }
  const text = cellText(value);
  if (!text) return "";
  const m = text.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const yearRaw = Number(m[3]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (
      d.getUTCFullYear() === year &&
      d.getUTCMonth() === month - 1 &&
      d.getUTCDate() === day
    ) {
      return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`;
    }
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("ru-RU");
  }
  return "";
}

export function buildFinanceInvoiceNumber(invoiceNumberRaw: string, invoiceDate: string): string {
  return `Счет ${invoiceNumberRaw.trim()} от ${invoiceDate.trim()}`;
}

function findHeaderRow(rows: unknown[][]): { rowIndex: number; cols: Record<keyof typeof REQUIRED_HEADER_ALIASES, number> } | null {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 30); rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const headers = row.map(normalizeHeader);
    const cols = {} as Record<keyof typeof REQUIRED_HEADER_ALIASES, number>;
    let ok = true;
    for (const [key, aliases] of Object.entries(REQUIRED_HEADER_ALIASES) as Array<
      [keyof typeof REQUIRED_HEADER_ALIASES, readonly string[]]
    >) {
      const idx = headers.findIndex((h) => aliases.includes(h));
      if (idx < 0) {
        ok = false;
        break;
      }
      cols[key] = idx;
    }
    if (ok) return { rowIndex, cols };
  }
  return null;
}

export function parseFinanceBankWorkbook(buffer: Buffer): FinanceBankImportParsedRow[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
  const header = findHeaderRow(rows);
  if (!header) {
    return [
      {
        sourceRow: 0,
        originalText: "",
        orderNumber: "",
        invoiceNumberRaw: "",
        dateRaw: "",
        invoiceDate: "",
        paid: false,
        apply: false,
        errors: ["Строка не распознана: не найдены нужные заголовки"],
      },
    ];
  }

  const out: FinanceBankImportParsedRow[] = [];
  for (let i = header.rowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (row.every((cell) => !cellText(cell))) continue;
    const comment = cellText(row[header.cols.comment]);
    const invoiceNumberRaw = cellText(row[header.cols.invoiceNumber]);
    const dateRaw = cellText(row[header.cols.date]);
    const invoiceDate = normalizeBankDate(row[header.cols.date]);
    const paid = isPaymentMarked(row[header.cols.payment]);
    const orderNumber = extractOrderNumberFromBankComment(comment);
    const errors: string[] = [];
    if (!paid) errors.push("Строка не распознана: нет признака оплаты");
    if (!orderNumber) errors.push("Строка не распознана: невозможно определить номер заказа");
    if (!invoiceNumberRaw) errors.push("Строка не распознана: не заполнен номер счёта");
    if (!invoiceDate) errors.push("Строка не распознана: не заполнена или не распознана дата");
    out.push({
      sourceRow: i + 1,
      originalText: row.map(cellText).filter(Boolean).join(" | "),
      orderNumber,
      invoiceNumberRaw,
      dateRaw,
      invoiceDate,
      paid,
      apply: paid && errors.length === 0,
      errors,
    });
  }
  return out;
}

export function parseFinanceBankText(text: string): FinanceBankImportParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const out: FinanceBankImportParsedRow[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const hasOrder = extractOrderNumberFromBankComment(line);
    if (!hasOrder && !/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(line)) continue;
    const invoiceMatch = line.match(/(?:^|\s)(\d{3,})(?=\s|$)/);
    const dateMatch = line.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/);
    const invoiceNumberRaw = invoiceMatch?.[1] ?? "";
    const invoiceDate = normalizeBankDate(dateMatch?.[1] ?? "");
    const paid = /оплат|плат[её]ж|зачисл|поступ/i.test(line);
    const errors: string[] = [];
    if (!paid) errors.push("Строка не распознана: нет признака оплаты");
    if (!hasOrder) errors.push("Строка не распознана: невозможно определить номер заказа");
    if (!invoiceNumberRaw) errors.push("Строка не распознана: не заполнен номер счёта");
    if (!invoiceDate) errors.push("Строка не распознана: не заполнена или не распознана дата");
    out.push({
      sourceRow: i + 1,
      originalText: line,
      orderNumber: hasOrder,
      invoiceNumberRaw,
      dateRaw: dateMatch?.[1] ?? "",
      invoiceDate,
      paid,
      apply: paid && errors.length === 0,
      errors,
    });
  }
  if (out.length === 0) {
    return [
      {
        sourceRow: 0,
        originalText: text.slice(0, 500),
        orderNumber: "",
        invoiceNumberRaw: "",
        dateRaw: "",
        invoiceDate: "",
        paid: false,
        apply: false,
        errors: ["Строка не распознана: невозможно выделить строки оплаты из текста"],
      },
    ];
  }
  return out;
}

export function normalizeFinanceBankApplyRow(row: FinanceBankImportApplyRow): FinanceBankImportParsedRow {
  const orderNumber = cellText(row.orderNumber);
  const invoiceNumberRaw = cellText(row.invoiceNumberRaw);
  const invoiceDate = normalizeBankDate(row.invoiceDate);
  const paid = Boolean(row.paid);
  const apply = Boolean(row.apply);
  const errors: string[] = [];
  if (!apply) errors.push("Строка пропущена пользователем");
  if (!paid) errors.push("Нет признака оплаты");
  if (!orderNumber) errors.push("Невозможно определить номер заказа");
  if (!invoiceNumberRaw) errors.push("Не заполнен номер счёта");
  if (!invoiceDate) errors.push("Не заполнена или не распознана дата");
  return {
    sourceRow: Number(row.sourceRow) || 0,
    originalText: "",
    orderNumber,
    invoiceNumberRaw,
    dateRaw: cellText(row.invoiceDate),
    invoiceDate,
    paid,
    apply,
    errors,
  };
}
