import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { parseDateRangeUTC } from "@/lib/clinic-finance";
import { buildClinicReconciliationPdfPayload } from "@/lib/clinic-reconciliation-pdf-data";
import {
  RECON_COL_W_PT,
  RECON_EXCEL_NUMFMT_RUB,
  reconExcelColWidth,
} from "@/lib/clinic-reconciliation-layout";

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
    fgColor: { argb: "FF5A5A5A" },
  };
}

function fillFg(
  fill: ExcelJS.Fill | undefined,
): { argb?: string; theme?: number } | undefined {
  if (!fill || fill.type !== "pattern") return undefined;
  return fill.fgColor as { argb?: string; theme?: number } | undefined;
}

function isLegacyColoredFill(fill: ExcelJS.Fill | undefined): boolean {
  const fg = fillFg(fill);
  if (!fg) return false;
  const argb = fg.argb?.toUpperCase();
  if (
    argb === "FFFFFF00" ||
    argb === "FF00FF00" ||
    argb === "FFF0F0F0" ||
    argb === "FFC8C8C8"
  ) {
    return true;
  }
  // В шаблоне зелёная заливка была theme 7.
  return fg.theme === 7;
}

async function resolveTemplatePath(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), "templates", TEMPLATE_NAME),
    path.join(process.cwd(), "public", "templates", TEMPLATE_NAME),
    path.join(process.cwd(), ".next", "standalone", "templates", TEMPLATE_NAME),
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
  let base = {} as ExcelJS.Style;
  try {
    base = JSON.parse(JSON.stringify(cell.style ?? {})) as ExcelJS.Style;
  } catch {
    base = { ...(cell.style ?? {}) } as ExcelJS.Style;
  }
  cell.style = { ...base, fill };
}

function setValueCell(
  cell: ExcelJS.Cell,
  value: string | number | null | undefined,
  asRub?: boolean,
) {
  cell.value = value ?? "";
  applyFill(cell, valueFill());
  if (asRub && typeof value === "number") {
    cell.numFmt = RECON_EXCEL_NUMFMT_RUB;
  }
}

function setHeadCell(cell: ExcelJS.Cell, value: string) {
  cell.value = value;
  applyFill(cell, headFill());
  cell.border = THIN_BORDER;
  cell.font = { ...(cell.font ?? {}), bold: true, color: { argb: "FFFFFFFF" }, size: 8 };
  cell.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
}

const THIN_BORDER: ExcelJS.Borders = {
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
  diagonal: { up: false, down: false, style: "thin", color: { argb: "FF000000" } },
};

function paintCell(
  cell: ExcelJS.Cell,
  fill: ExcelJS.Fill,
  extra?: Partial<ExcelJS.Style>,
) {
  applyFill(cell, fill);
  cell.border = THIN_BORDER;
  cell.alignment = {
    wrapText: true,
    vertical: "top",
    ...(extra?.alignment ?? {}),
  };
}

/** Палитра и сетка без оглядки на theme/жёлтый шаблона. */
function applyPalette(sheet: ExcelJS.Worksheet, metaShift: number) {
  const metaRowN = META_ROW + metaShift;
  const headerRowN = metaRowN + 3;
  const dataFirstN = DATA_FIRST + metaShift;

  for (const c of [6, 7, 8, 9]) {
    const cell = sheet.getRow(SUMMARY_FIRST).getCell(c);
    paintCell(cell, headFill(), {
      alignment: { wrapText: true, vertical: "middle", horizontal: "center" },
    });
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 8 };
  }
  for (let r = SUMMARY_FIRST + 1; r < SUMMARY_FIRST + SUMMARY_CAPACITY + metaShift; r++) {
    for (const c of [6, 7, 8, 9]) {
      paintCell(sheet.getRow(r).getCell(c), valueFill());
    }
  }

  for (let c = 1; c <= 10; c++) {
    paintCell(sheet.getRow(metaRowN).getCell(c), valueFill(), {
      alignment: { wrapText: true, vertical: "middle", horizontal: "center" },
    });
  }
  paintCell(sheet.getRow(metaRowN + 1).getCell(9), headFill(), {
    alignment: { wrapText: true, vertical: "middle", horizontal: "center" },
  });
  paintCell(sheet.getRow(metaRowN + 2).getCell(9), headFill(), {
    alignment: { wrapText: true, vertical: "middle", horizontal: "center" },
  });
  paintCell(sheet.getRow(metaRowN + 1).getCell(10), valueFill(), {
    alignment: { wrapText: true, vertical: "middle", horizontal: "right" },
  });
  paintCell(sheet.getRow(metaRowN + 2).getCell(10), valueFill(), {
    alignment: { wrapText: true, vertical: "middle", horizontal: "right" },
  });

  for (let c = 1; c <= 10; c++) {
    const cell = sheet.getRow(headerRowN).getCell(c);
    paintCell(cell, headFill(), {
      alignment: { wrapText: true, vertical: "middle", horizontal: "center" },
    });
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 8 };
  }

  for (let r = dataFirstN; r <= sheet.rowCount; r++) {
    for (let c = 1; c <= 10; c++) {
      paintCell(sheet.getRow(r).getCell(c), valueFill());
    }
  }
}

function recolorTemplateFills(sheet: ExcelJS.Worksheet) {
  sheet.eachRow({ includeEmpty: true }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (!isLegacyColoredFill(cell.fill)) return;
      const fg = fillFg(cell.fill);
      const argb = fg?.argb?.toUpperCase();
      const theme = fg?.theme;
      const isHead =
        row.number === 20 ||
        theme === 7 ||
        argb === "FF00FF00" ||
        argb === "FFC8C8C8" ||
        argb === "FF7A7A7A" ||
        argb === "FF5A5A5A";
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
  clinicId: string | string[],
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

  const summary = payload.summary;
  let metaShift = 0;
  if (summary.length + 1 > SUMMARY_CAPACITY) {
    metaShift = summary.length + 1 - SUMMARY_CAPACITY;
    sheet.spliceRows(
      SUMMARY_FIRST + SUMMARY_CAPACITY,
      0,
      ...Array.from({ length: metaShift }, () => []),
    );
  }

  const headRow = sheet.getRow(SUMMARY_FIRST);
  setHeadCell(headRow.getCell(6), "НАИМЕНОВАНИЕ ПОЗИЦИИ");
  setHeadCell(headRow.getCell(7), "КОЛ-ВО ЕДИНИЦ");
  setHeadCell(headRow.getCell(8), "СТОИМОСТЬ ЕДИНИЦЫ БЕЗ СКИДОК");
  setHeadCell(headRow.getCell(9), "СУММА ЕДИНИЦ БЕЗ СКИДОК");

  for (let i = 0; i < summary.length; i++) {
    const row = sheet.getRow(SUMMARY_FIRST + 1 + i);
    const s = summary[i]!;
    setValueCell(row.getCell(6), s.label);
    setValueCell(row.getCell(7), s.quantity);
    setValueCell(row.getCell(8), s.unitRub, true);
    setValueCell(row.getCell(9), s.totalRub, true);
  }
  for (
    let r = SUMMARY_FIRST + 1 + summary.length;
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
  setValueCell(meta.getCell(9), payload.yellowRow.baseTotalRub, true);
  setValueCell(meta.getCell(10), payload.yellowRow.discountedTotalRub, true);

  setValueCell(
    sheet.getRow(metaRowN + 1).getCell(10),
    payload.yellowRow.discountedTotalRub,
    true,
  );
  setValueCell(
    sheet.getRow(metaRowN + 2).getCell(10),
    payload.yellowRow.vatRub,
    true,
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
    setValueCell(row.getCell(8), line.unitRub == null ? "" : line.unitRub, true);
    setValueCell(row.getCell(9), line.lineTotalRub, true);
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

  applyPalette(sheet, metaShift);

  for (let c = 1; c <= 10; c++) {
    sheet.getColumn(c).width = reconExcelColWidth(RECON_COL_W_PT[c - 1]!);
  }
  sheet.getColumn(11).width = 3;
  sheet.getColumn(12).width = 3;
  sheet.pageSetup = {
    ...sheet.pageSetup,
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

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
