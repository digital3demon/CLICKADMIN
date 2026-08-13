import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { parseDateRangeUTC } from "@/lib/clinic-finance";
import { buildClinicReconciliationPdfPayload } from "@/lib/clinic-reconciliation-pdf-data";

type DateRangeUtc = { from: Date; to: Date };

const TEMPLATE_NAME = "reconciliation-sverka.xlsx";

/** Строка метаданных в шаблоне (до insert сводки). */
const META_ROW = 17;
const SUMMARY_FIRST = 1;
const SUMMARY_CAPACITY = 13;
const DATA_FIRST = 21;

/** Светло-серый (строки / поля значений). Новый объект на ячейку — exceljs шарит fill. */
function valueFill(): ExcelJS.Fill {
  return {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF2F2F2" },
  };
}

/** Тёмно-серый (шапки и подписи «к оплате»). */
function headFill(): ExcelJS.Fill {
  return {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF7A7A7A" },
  };
}

function isLegacyColoredFill(fill: ExcelJS.Fill | undefined): boolean {
  if (!fill || fill.type !== "pattern" || !fill.fgColor) return false;
  const argb = (fill.fgColor as { argb?: string }).argb?.toUpperCase();
  if (
    argb === "FFFFFF00" ||
    argb === "FF00FF00" ||
    argb === "FFF0F0F0" ||
    argb === "FFC8C8C8"
  ) {
    return true;
  }
  const theme = (fill.fgColor as { theme?: number }).theme;
  // В шаблоне зелёная заливка была theme 7.
  return theme === 7;
}

async function resolveTemplatePath(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), "templates", TEMPLATE_NAME),
    path.join(process.cwd(), "public", "templates", TEMPLATE_NAME),
  ];
  for (const p of candidates) {
    try {
      await fs.access(p);
      return p;
    } catch {
      /* next */
    }
  }
  throw new Error(
    `Не найден шаблон сверки (${TEMPLATE_NAME}). Ожидался templates/${TEMPLATE_NAME}`,
  );
}

async function loadTemplateWorkbook(): Promise<ExcelJS.Workbook> {
  const abs = await resolveTemplatePath();
  const buf = await fs.readFile(abs);
  const workbook = new ExcelJS.Workbook();
  // exceljs types: Buffer | ArrayBuffer
  await workbook.xlsx.load(buf as unknown as ArrayBuffer);
  return workbook;
}

function applyFill(cell: ExcelJS.Cell, fill: ExcelJS.Fill) {
  // Клон style обязателен: exceljs шарит xf, иначе заливка шапки/строк сливается.
  let base: ExcelJS.Style = {};
  try {
    base = JSON.parse(JSON.stringify(cell.style ?? {})) as ExcelJS.Style;
  } catch {
    base = { ...(cell.style ?? {}) };
  }
  cell.style = { ...base, fill };
}

function setValueCell(
  cell: ExcelJS.Cell,
  value: string | number | null | undefined,
) {
  cell.value = value ?? "";
  applyFill(cell, valueFill());
}

function recolorTemplateFills(sheet: ExcelJS.Worksheet) {
  sheet.eachRow({ includeEmpty: true }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (!isLegacyColoredFill(cell.fill)) return;
      const argb = (cell.fill?.fgColor as { argb?: string } | undefined)?.argb
        ?.toUpperCase();
      const theme = (cell.fill?.fgColor as { theme?: number } | undefined)
        ?.theme;
      // Шапка (стр. 20) и «к оплате» / старый зелёный → тёмно-серый; остальное → светлый.
      const isHead =
        row.number === 20 ||
        theme === 7 ||
        argb === "FF00FF00" ||
        argb === "FFC8C8C8";
      if (isHead && row.number < DATA_FIRST) {
        applyFill(cell, headFill());
      } else {
        applyFill(cell, valueFill());
      }
    });
  });
}

/**
 * Выгрузка сверки: заполнение полей значений шаблона (подписи формы — серая шапка).
 */
export async function buildClinicReconciliationXlsxBuffer(
  clinicId: string,
  _clinicName: string,
  range: DateRangeUtc,
  selectedOrderIds?: string[] | null,
): Promise<{ buffer: Buffer; fromStr: string; toStr: string }> {
  const fromStr = range.from.toISOString().slice(0, 10);
  const toStr = range.to.toISOString().slice(0, 10);

  const payload = await buildClinicReconciliationPdfPayload(
    clinicId,
    range,
    selectedOrderIds,
  );

  const workbook = await loadTemplateWorkbook();
  const sheet = workbook.getWorksheet("ШАБЛОН") ?? workbook.worksheets[0];
  if (!sheet) {
    throw new Error("В шаблоне сверки нет листа");
  }

  recolorTemplateFills(sheet);

  /** Снимок ширин до splice — иначе после вставки строк границы «скачут». */
  const lockedColWidths: Array<number | undefined> = [];
  for (let c = 1; c <= 12; c++) {
    lockedColWidths[c] = sheet.getColumn(c).width;
  }

  const summary = payload.summary;
  let metaShift = 0;
  if (summary.length > SUMMARY_CAPACITY) {
    metaShift = summary.length - SUMMARY_CAPACITY;
    sheet.spliceRows(
      SUMMARY_FIRST + SUMMARY_CAPACITY,
      0,
      ...Array.from({ length: metaShift }, () => []),
    );
  }

  for (let i = 0; i < summary.length; i++) {
    const row = sheet.getRow(SUMMARY_FIRST + i);
    const s = summary[i]!;
    setValueCell(row.getCell(6), s.label);
    setValueCell(row.getCell(7), s.quantity);
    setValueCell(row.getCell(8), s.unitRub);
    setValueCell(row.getCell(9), s.totalRub);
  }
  for (
    let r = SUMMARY_FIRST + summary.length;
    r < SUMMARY_FIRST + SUMMARY_CAPACITY + metaShift;
    r++
  ) {
    const row = sheet.getRow(r);
    for (const c of [6, 7, 8, 9]) {
      setValueCell(row.getCell(c), "");
    }
  }

  const metaRowN = META_ROW + metaShift;
  const dataFirstN = DATA_FIRST + metaShift;

  const meta = sheet.getRow(metaRowN);
  setValueCell(meta.getCell(1), payload.labLegalName);
  setValueCell(meta.getCell(4), payload.periodFromLabel);
  setValueCell(meta.getCell(5), payload.periodToLabel);
  setValueCell(meta.getCell(6), payload.clinicTitleLine);
  setValueCell(meta.getCell(7), payload.yellowRow.totalUnits);
  setValueCell(meta.getCell(9), payload.yellowRow.baseTotalRub);
  setValueCell(meta.getCell(10), payload.yellowRow.discountedTotalRub);

  setValueCell(
    sheet.getRow(metaRowN + 1).getCell(10),
    payload.yellowRow.discountedTotalRub,
  );
  setValueCell(
    sheet.getRow(metaRowN + 2).getCell(10),
    payload.yellowRow.vatRub,
  );

  const detail = payload.detail;
  const templateDataRows = Math.max(8, sheet.rowCount - dataFirstN + 1);
  if (detail.length > templateDataRows) {
    sheet.spliceRows(
      dataFirstN + templateDataRows,
      0,
      ...Array.from({ length: detail.length - templateDataRows }, () => []),
    );
  }

  const sampleRow = sheet.getRow(dataFirstN);
  for (let i = 0; i < detail.length; i++) {
    const line = detail[i]!;
    const row = sheet.getRow(dataFirstN + i);
    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c);
      try {
        const sampleStyle = JSON.parse(
          JSON.stringify(sampleRow.getCell(c).style ?? {}),
        ) as ExcelJS.Style;
        cell.style = { ...sampleStyle, fill: valueFill() };
      } catch {
        applyFill(cell, valueFill());
      }
    }
    if (line.showOrderColumns) {
      setValueCell(row.getCell(1), line.zashla);
      setValueCell(row.getCell(2), line.otpr === "—" ? "" : line.otpr);
      setValueCell(row.getCell(3), line.orderNumber);
      setValueCell(row.getCell(4), line.patient);
      setValueCell(row.getCell(5), line.doctor);
    } else {
      for (const c of [1, 2, 3, 4, 5]) setValueCell(row.getCell(c), "");
    }
    setValueCell(row.getCell(6), line.description);
    setValueCell(row.getCell(7), line.quantity);
    setValueCell(row.getCell(8), line.unitRub == null ? "" : line.unitRub);
    setValueCell(row.getCell(9), line.lineTotalRub);
    setValueCell(
      row.getCell(10),
      line.discountPercent == null
        ? ""
        : `${String(line.discountPercent).replace(".", ",")}%`,
    );
  }

  for (let r = dataFirstN + detail.length; r < dataFirstN + templateDataRows; r++) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= 10; c++) {
      setValueCell(row.getCell(c), "");
    }
  }

  for (let c = 1; c <= 12; c++) {
    const w = lockedColWidths[c];
    if (w != null) sheet.getColumn(c).width = w;
  }

  const buf = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buf),
    fromStr,
    toStr,
  };
}

export function parseRangeFromYmdStrings(
  fromStr: string,
  toStr: string,
): DateRangeUtc | null {
  return parseDateRangeUTC(fromStr, toStr);
}
