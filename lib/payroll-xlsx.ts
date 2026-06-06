/**
 * Шаблон Excel для настройки ФОТ (цены техникам по позициям прайса).
 * Лист: блок «Прайс» (код, позиция, колонки CAD / CAD Хирургия / Мануал / Обработка)
 * и блок «Без категории» (код, позиция, название плашки, цена).
 */
import ExcelJS from "exceljs";
import type { PayrollWorkKind } from "@prisma/client";
import {
  PAYROLL_WORK_KIND_LABELS,
  PAYROLL_WORK_KIND_VALUES,
  type PayrollWorkKindValue,
} from "@/lib/payroll";

export const PAYROLL_XLSX_SHEET_NAME = "ФОТ";

/** Категории с отдельными столбцами в шаблоне (без «Без категории»). */
export const PAYROLL_XLSX_CATEGORIZED_KINDS = PAYROLL_WORK_KIND_VALUES.filter(
  (k) => k !== "UNCATEGORIZED",
) as Exclude<PayrollWorkKindValue, "UNCATEGORIZED">[];

export const PAYROLL_KIND_COLUMN_HEADERS: Record<
  (typeof PAYROLL_XLSX_CATEGORIZED_KINDS)[number],
  string
> = {
  CAD: "CAD (₽)",
  CAD_SURGERY: "CAD Хирургия (₽)",
  MANUAL: "Мануал (₽)",
  PROCESSING: "Обработка (₽)",
};

const UNCAT_MARKER = "БЕЗ КАТЕГОРИИ";
const MAIN_CODE_HEADER = "Код";
const MAIN_NAME_HEADER = "Позиция";

export type PayrollPriceItemRef = {
  id: string;
  code: string;
  name: string;
  sectionTitle?: string | null;
  subsectionTitle?: string | null;
};

export type PayrollConfigRef = {
  id: string;
  priceListItemId: string;
  kind: PayrollWorkKind;
  amountRub: number;
  description: string;
};

export type PayrollImportIssue = { field: string; message: string };

export type PayrollImportPreviewRow = {
  rowNumber: number;
  section: "priced" | "uncategorized";
  priceListItemId: string | null;
  priceCode: string;
  priceName: string;
  kind: PayrollWorkKindValue;
  kindLabel: string;
  amountRub: number;
  description: string;
  action: "create" | "update" | "unchanged";
  existingConfigId: string | null;
  existingAmountRub: number | null;
  existingDescription: string | null;
  issues: PayrollImportIssue[];
};

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object" && value !== null && "richText" in value) {
    return (value as ExcelJS.CellRichTextValue).richText
      .map((p) => p.text)
      .join("")
      .trim();
  }
  if (value instanceof Date) return "";
  return String(value).trim();
}

export function parsePayrollAmountCell(value: ExcelJS.CellValue): number | null {
  const text = cellText(value).replace(/\s/g, "").replace(",", ".");
  if (!text) return null;
  const n = Number.parseFloat(text);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function normalizeCode(code: string): string {
  return code.trim().replace(/\s/g, "");
}

function headerToKind(header: string): (typeof PAYROLL_XLSX_CATEGORIZED_KINDS)[number] | null {
  const h = header.trim().toLowerCase();
  for (const kind of PAYROLL_XLSX_CATEGORIZED_KINDS) {
    const label = PAYROLL_WORK_KIND_LABELS[kind].toLowerCase();
    if (h === label || h.startsWith(label)) return kind;
    const col = PAYROLL_KIND_COLUMN_HEADERS[kind].toLowerCase();
    if (h === col || h.startsWith(col.replace(/\s*\(₽\)\s*$/i, ""))) return kind;
  }
  if (h === "cad" || h.startsWith("cad ")) {
    if (h.includes("хирург")) return "CAD_SURGERY";
    return "CAD";
  }
  if (h.includes("мануал")) return "MANUAL";
  if (h.includes("обработ")) return "PROCESSING";
  return null;
}

type ParsedMainRow = {
  rowNumber: number;
  code: string;
  priceName: string;
  amounts: Partial<Record<(typeof PAYROLL_XLSX_CATEGORIZED_KINDS)[number], number>>;
};

type ParsedUncatRow = {
  rowNumber: number;
  code: string;
  priceName: string;
  description: string;
  amountRub: number;
};

export function parsePayrollWorksheetRows(
  ws: ExcelJS.Worksheet,
): { main: ParsedMainRow[]; uncategorized: ParsedUncatRow[]; parseIssues: string[] } {
  const parseIssues: string[] = [];
  const main: ParsedMainRow[] = [];
  const uncategorized: ParsedUncatRow[] = [];

  let mainHeaderRow = 0;
  let kindByCol = new Map<number, (typeof PAYROLL_XLSX_CATEGORIZED_KINDS)[number]>();
  let uncatHeaderRow = 0;

  const rowCount = ws.rowCount;
  for (let r = 1; r <= rowCount; r++) {
    const row = ws.getRow(r);
    const a = cellText(row.getCell(1).value);
    const b = cellText(row.getCell(2).value);
    if (!mainHeaderRow && a === MAIN_CODE_HEADER && b.toLowerCase().startsWith("позици")) {
      mainHeaderRow = r;
      kindByCol = new Map();
      row.eachCell({ includeEmpty: false }, (cell, col) => {
        if (col <= 2) return;
        const kind = headerToKind(cellText(cell.value));
        if (kind) kindByCol.set(col, kind);
      });
      continue;
    }
    if (a.toUpperCase().includes(UNCAT_MARKER)) {
      uncatHeaderRow = r + 1;
      continue;
    }
    if (uncatHeaderRow > 0 && r === uncatHeaderRow) continue;

    if (mainHeaderRow > 0 && r > mainHeaderRow && (uncatHeaderRow === 0 || r < uncatHeaderRow - 1)) {
      const code = normalizeCode(a);
      if (!code && !b) continue;
      if (a.toUpperCase().includes(UNCAT_MARKER)) continue;
      const amounts: ParsedMainRow["amounts"] = {};
      for (const [col, kind] of kindByCol) {
        const amt = parsePayrollAmountCell(row.getCell(col).value);
        if (amt != null) amounts[kind] = amt;
      }
      if (!code) {
        parseIssues.push(`Строка ${r}: нет кода позиции прайса`);
        continue;
      }
      if (Object.keys(amounts).length === 0) continue;
      main.push({ rowNumber: r, code, priceName: b, amounts });
      continue;
    }

    if (uncatHeaderRow > 0 && r > uncatHeaderRow) {
      const code = normalizeCode(a);
      const description = cellText(row.getCell(3).value);
      const amountRub = parsePayrollAmountCell(row.getCell(4).value);
      if (!code && !b && !description && amountRub == null) continue;
      if (!code) {
        parseIssues.push(`Строка ${r} (без категории): укажите код позиции прайса`);
        continue;
      }
      if (!description) {
        parseIssues.push(`Строка ${r} (без категории): укажите название плашки`);
        continue;
      }
      if (amountRub == null) {
        parseIssues.push(`Строка ${r} (без категории): укажите цену`);
        continue;
      }
      uncategorized.push({
        rowNumber: r,
        code,
        priceName: b,
        description,
        amountRub,
      });
    }
  }

  if (!mainHeaderRow) {
    parseIssues.push('Не найдена шапка «Код / Позиция» — скачайте шаблон из CRM заново.');
  }

  return { main, uncategorized, parseIssues };
}

export function buildPayrollImportPreview(opts: {
  priceItems: PayrollPriceItemRef[];
  existingConfigs: PayrollConfigRef[];
  main: ParsedMainRow[];
  uncategorized: ParsedUncatRow[];
}): PayrollImportPreviewRow[] {
  const byCode = new Map(
    opts.priceItems.map((p) => [normalizeCode(p.code), p] as const),
  );
  const configKey = (itemId: string, kind: PayrollWorkKindValue) => `${itemId}:${kind}`;
  const configByKey = new Map<string, PayrollConfigRef>();
  for (const c of opts.existingConfigs) {
    const key = configKey(c.priceListItemId, c.kind as PayrollWorkKindValue);
    if (!configByKey.has(key)) configByKey.set(key, c);
  }

  const out: PayrollImportPreviewRow[] = [];

  for (const row of opts.main) {
    const item = byCode.get(row.code);
    const issues: PayrollImportIssue[] = [];
    if (!item) {
      issues.push({ field: "code", message: `Код «${row.code}» не найден в активном прайсе` });
    }
    for (const kind of PAYROLL_XLSX_CATEGORIZED_KINDS) {
      const amountRub = row.amounts[kind];
      if (amountRub == null) continue;
      const existing = item ? configByKey.get(configKey(item.id, kind)) : undefined;
      const description =
        existing?.description?.trim() ||
        `${PAYROLL_WORK_KIND_LABELS[kind]} · ${row.code}`;
      let action: PayrollImportPreviewRow["action"] = "create";
      if (existing) {
        if (existing.amountRub === amountRub && existing.description === description) {
          action = "unchanged";
        } else {
          action = "update";
        }
      }
      out.push({
        rowNumber: row.rowNumber,
        section: "priced",
        priceListItemId: item?.id ?? null,
        priceCode: row.code,
        priceName: item?.name ?? row.priceName,
        kind,
        kindLabel: PAYROLL_WORK_KIND_LABELS[kind],
        amountRub,
        description,
        action,
        existingConfigId: existing?.id ?? null,
        existingAmountRub: existing?.amountRub ?? null,
        existingDescription: existing?.description ?? null,
        issues,
      });
    }
  }

  for (const row of opts.uncategorized) {
    const item = byCode.get(row.code);
    const issues: PayrollImportIssue[] = [];
    if (!item) {
      issues.push({ field: "code", message: `Код «${row.code}» не найден в активном прайсе` });
    }
    const existing = item
      ? [...opts.existingConfigs].find(
          (c) =>
            c.priceListItemId === item.id &&
            c.kind === "UNCATEGORIZED" &&
            c.description.trim() === row.description.trim(),
        )
      : undefined;
    let action: PayrollImportPreviewRow["action"] = "create";
    if (existing) {
      if (existing.amountRub === row.amountRub) action = "unchanged";
      else action = "update";
    }
    out.push({
      rowNumber: row.rowNumber,
      section: "uncategorized",
      priceListItemId: item?.id ?? null,
      priceCode: row.code,
      priceName: item?.name ?? row.priceName,
      kind: "UNCATEGORIZED",
      kindLabel: PAYROLL_WORK_KIND_LABELS.UNCATEGORIZED,
      amountRub: row.amountRub,
      description: row.description.trim(),
      action,
      existingConfigId: existing?.id ?? null,
      existingAmountRub: existing?.amountRub ?? null,
      existingDescription: existing?.description ?? null,
      issues,
    });
  }

  return out.sort((a, b) => a.rowNumber - b.rowNumber);
}

export async function buildPayrollConfigXlsxBuffer(opts: {
  priceItems: PayrollPriceItemRef[];
  configs: PayrollConfigRef[];
  includeCategoryColumns: boolean;
}): Promise<Buffer> {
  const configMap = new Map<string, number>();
  for (const c of opts.configs) {
    if (PAYROLL_XLSX_CATEGORIZED_KINDS.includes(c.kind as (typeof PAYROLL_XLSX_CATEGORIZED_KINDS)[number])) {
      configMap.set(`${c.priceListItemId}:${c.kind}`, c.amountRub);
    }
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "dental-lab-crm";
  const ws = wb.addWorksheet(PAYROLL_XLSX_SHEET_NAME, {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  ws.getCell(1, 1).value =
    "Шаблон ФОТ. Не меняйте заголовки во 2-й строке. Пустые ячейки цен не импортируются.";
  ws.mergeCells(1, 1, 1, opts.includeCategoryColumns ? 2 + PAYROLL_XLSX_CATEGORIZED_KINDS.length : 2);

  const headerRow = ws.getRow(2);
  headerRow.getCell(1).value = MAIN_CODE_HEADER;
  headerRow.getCell(2).value = MAIN_NAME_HEADER;
  if (opts.includeCategoryColumns) {
    PAYROLL_XLSX_CATEGORIZED_KINDS.forEach((kind, i) => {
      headerRow.getCell(3 + i).value = PAYROLL_KIND_COLUMN_HEADERS[kind];
    });
  }
  headerRow.font = { bold: true };

  let r = 3;
  for (const item of opts.priceItems) {
    const row = ws.getRow(r);
    row.getCell(1).value = item.code;
    row.getCell(2).value = item.name;
    if (opts.includeCategoryColumns) {
      PAYROLL_XLSX_CATEGORIZED_KINDS.forEach((kind, i) => {
        const amt = configMap.get(`${item.id}:${kind}`);
        if (amt != null) row.getCell(3 + i).value = amt;
      });
    }
    r += 1;
  }

  r += 1;
  ws.getRow(r).getCell(1).value = `--- ${UNCAT_MARKER} ---`;
  r += 1;
  const uncatHeader = ws.getRow(r);
  uncatHeader.getCell(1).value = MAIN_CODE_HEADER;
  uncatHeader.getCell(2).value = "Позиция прайса";
  uncatHeader.getCell(3).value = "Название плашки";
  uncatHeader.getCell(4).value = "Цена (₽)";
  uncatHeader.font = { bold: true };
  r += 1;

  const uncatConfigs = opts.configs.filter((c) => c.kind === "UNCATEGORIZED");
  const itemById = new Map(opts.priceItems.map((p) => [p.id, p]));
  for (const c of uncatConfigs) {
    const item = itemById.get(c.priceListItemId);
    const row = ws.getRow(r);
    row.getCell(1).value = item?.code ?? "";
    row.getCell(2).value = item?.name ?? "";
    row.getCell(3).value = c.description;
    row.getCell(4).value = c.amountRub;
    r += 1;
  }
  r += 5;

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 42;
  ws.getColumn(3).width = 28;
  ws.getColumn(4).width = 14;
  if (opts.includeCategoryColumns) {
    for (let c = 5; c <= 2 + PAYROLL_XLSX_CATEGORIZED_KINDS.length; c++) {
      ws.getColumn(c).width = 16;
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function parsePayrollConfigXlsxBuffer(
  buffer: Buffer,
): Promise<ReturnType<typeof parsePayrollWorksheetRows>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const ws =
    wb.getWorksheet(PAYROLL_XLSX_SHEET_NAME) ?? wb.worksheets[0];
  if (!ws) {
    return { main: [], uncategorized: [], parseIssues: ["Пустой файл Excel"] };
  }
  return parsePayrollWorksheetRows(ws);
}
