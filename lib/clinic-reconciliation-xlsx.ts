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

const YELLOW_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFFF00" },
};

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

function setYellowValue(
  cell: ExcelJS.Cell,
  value: string | number | null | undefined,
) {
  cell.value = value ?? "";
  cell.fill = YELLOW_FILL;
}

/**
 * Выгрузка сверки: заполнение жёлтых ячеек шаблона (зелёные подписи не меняем).
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
    setYellowValue(row.getCell(6), s.label);
    setYellowValue(row.getCell(7), s.quantity);
    setYellowValue(row.getCell(8), s.unitRub);
    setYellowValue(row.getCell(9), s.totalRub);
  }
  for (
    let r = SUMMARY_FIRST + summary.length;
    r < SUMMARY_FIRST + SUMMARY_CAPACITY + metaShift;
    r++
  ) {
    const row = sheet.getRow(r);
    for (const c of [6, 7, 8, 9]) {
      setYellowValue(row.getCell(c), "");
    }
  }

  const metaRowN = META_ROW + metaShift;
  const dataFirstN = DATA_FIRST + metaShift;

  const meta = sheet.getRow(metaRowN);
  setYellowValue(meta.getCell(1), payload.labLegalName);
  setYellowValue(meta.getCell(4), payload.periodFromLabel);
  setYellowValue(meta.getCell(5), payload.periodToLabel);
  setYellowValue(meta.getCell(6), payload.clinicTitleLine);
  setYellowValue(meta.getCell(7), payload.yellowRow.totalUnits);
  setYellowValue(meta.getCell(9), payload.yellowRow.baseTotalRub);
  setYellowValue(meta.getCell(10), payload.yellowRow.discountedTotalRub);

  setYellowValue(
    sheet.getRow(metaRowN + 1).getCell(10),
    payload.yellowRow.discountedTotalRub,
  );
  setYellowValue(
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
        cell.style = { ...sampleRow.getCell(c).style };
      } catch {
        /* ignore style copy */
      }
      cell.fill = YELLOW_FILL;
    }
    if (line.showOrderColumns) {
      setYellowValue(row.getCell(1), line.zashla);
      setYellowValue(row.getCell(2), line.otpr === "—" ? "" : line.otpr);
      setYellowValue(row.getCell(3), line.orderNumber);
      setYellowValue(row.getCell(4), line.patient);
      setYellowValue(row.getCell(5), line.doctor);
    } else {
      for (const c of [1, 2, 3, 4, 5]) setYellowValue(row.getCell(c), "");
    }
    setYellowValue(row.getCell(6), line.description);
    setYellowValue(row.getCell(7), line.quantity);
    setYellowValue(row.getCell(8), line.unitRub == null ? "" : line.unitRub);
    setYellowValue(row.getCell(9), line.lineTotalRub);
    setYellowValue(
      row.getCell(10),
      line.discountPercent == null
        ? ""
        : `${String(line.discountPercent).replace(".", ",")}%`,
    );
  }

  for (let r = dataFirstN + detail.length; r < dataFirstN + templateDataRows; r++) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= 10; c++) {
      setYellowValue(row.getCell(c), "");
    }
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
