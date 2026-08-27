/**
 * Лист сверки без шаблона: те же 10 колонок, что PDF.
 * Сводка в колонках F–I (имя = «Выставлено», сумма над «Всего к оплате»).
 */
import type ExcelJS from "exceljs";
import type { ClinicReconciliationPdfPayload } from "@/lib/clinic-reconciliation-pdf-data";
import {
  RECON_COL_W_PT,
  RECON_EXCEL_NUMFMT_RUB,
  reconExcelColWidth,
} from "@/lib/clinic-reconciliation-layout";

const THIN: ExcelJS.Borders = {
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
  diagonal: { up: false, down: false, style: "thin", color: { argb: "FF000000" } },
};

function valueFill(): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
}

function headFill(): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: "FF5A5A5A" } };
}

function paint(
  cell: ExcelJS.Cell,
  value: string | number | null | undefined,
  opts?: {
    head?: boolean;
    rub?: boolean;
    align?: ExcelJS.Alignment["horizontal"];
  },
) {
  cell.value = value ?? "";
  cell.fill = opts?.head ? headFill() : valueFill();
  cell.border = THIN;
  cell.font = opts?.head
    ? { bold: true, color: { argb: "FFFFFFFF" }, size: 8 }
    : { bold: false, color: { argb: "FF000000" }, size: 9 };
  cell.alignment = {
    wrapText: !opts?.rub,
    vertical: "middle",
    horizontal: opts?.align ?? (opts?.head ? "center" : "left"),
  };
  if (opts?.rub && typeof value === "number") {
    cell.numFmt = RECON_EXCEL_NUMFMT_RUB;
  }
}

/** Рамка на всех ячейках объединения — иначе ExcelJS оставляет «дыры». */
function frameSpan(
  row: ExcelJS.Row,
  from: number,
  to: number,
  fill: ExcelJS.Fill,
) {
  for (let c = from; c <= to; c++) {
    const cell = row.getCell(c);
    cell.border = THIN;
    cell.fill = fill;
  }
}

function excelColWidth(pt: number, col: number): number {
  const w = reconExcelColWidth(pt);
  // H–I: «р. 403 020,00» не влезает в pt/7 → Excel рисует #####
  if (col === 8 || col === 9) return Math.max(w, 16);
  // J — СКИДКА: не сжимать в 0 при fitToWidth / пустых %
  if (col === 10) return Math.max(w, 12);
  return w;
}

function merge(sheet: ExcelJS.Worksheet, range: string) {
  sheet.mergeCells(range);
}

export function writeReconciliationSheet(
  sheet: ExcelJS.Worksheet,
  payload: ClinicReconciliationPdfPayload,
): void {
  sheet.name = "Сверка";
  for (let c = 1; c <= 10; c++) {
    const col = sheet.getColumn(c);
    col.width = excelColWidth(RECON_COL_W_PT[c - 1]!, c);
    col.hidden = false;
  }

  const head = sheet.getRow(1);
  head.height = 22;
  paint(head.getCell(6), "НАИМЕНОВАНИЕ ПОЗИЦИИ", { head: true });
  paint(head.getCell(7), "КОЛ-ВО ЕДИНИЦ", { head: true });
  paint(head.getCell(8), "СТОИМОСТЬ ЕДИНИЦЫ БЕЗ СКИДОК", { head: true });
  paint(head.getCell(9), "СУММА ЕДИНИЦ БЕЗ СКИДОК", { head: true });
  frameSpan(head, 6, 9, headFill());

  const summary = payload.summary;
  for (let i = 0; i < summary.length; i++) {
    const r = 2 + i;
    const row = sheet.getRow(r);
    const s = summary[i]!;
    paint(row.getCell(6), s.label);
    paint(row.getCell(7), s.quantity, { align: "right" });
    paint(row.getCell(8), s.unitRub, { rub: true, align: "right" });
    paint(row.getCell(9), s.totalRub, { rub: true, align: "right" });
  }

  const metaR = 2 + summary.length;
  const meta = sheet.getRow(metaR);
  meta.height = 20;
  merge(sheet, `A${metaR}:C${metaR}`);
  paint(meta.getCell(1), payload.labLegalName, { align: "center" });
  frameSpan(meta, 1, 3, valueFill());
  paint(meta.getCell(4), payload.periodFromLabel, { align: "center" });
  paint(meta.getCell(5), payload.periodToLabel, { align: "center" });
  paint(meta.getCell(6), payload.clinicTitleLine, { align: "center" });
  paint(meta.getCell(7), payload.yellowRow.totalUnits, { align: "right" });
  paint(meta.getCell(8), "\u00A0");
  paint(meta.getCell(9), payload.yellowRow.baseTotalRub, {
    rub: true,
    align: "right",
  });
  paint(meta.getCell(10), payload.yellowRow.discountedTotalRub, {
    rub: true,
    align: "right",
  });
  for (let c = 1; c <= 10; c++) {
    const cell = meta.getCell(c);
    cell.border = {
      ...THIN,
      bottom: { style: "medium", color: { argb: "FF000000" } },
    };
  }

  const payR = metaR + 1;
  const vatR = metaR + 2;
  paint(sheet.getRow(payR).getCell(9), "Всего к оплате:", { head: true });
  paint(sheet.getRow(payR).getCell(10), payload.yellowRow.discountedTotalRub, {
    rub: true,
    align: "right",
  });
  paint(sheet.getRow(vatR).getCell(9), "В т.ч. Сумма НДС 5%:", { head: true });
  paint(sheet.getRow(vatR).getCell(10), payload.yellowRow.vatRub, {
    rub: true,
    align: "right",
  });

  const hdrR = metaR + 3;
  const hdr = sheet.getRow(hdrR);
  hdr.height = 28;
  const headers = [
    "Дата когда зашла работа",
    "Дата отправки работы",
    "Номер заказ-наряда",
    "Пациент",
    "Врач",
    "Выставлено(наименование позиции)",
    "Кол-во единиц",
    "Цена за единицу",
    "Стоим. (Сумма единиц)",
    "СКИДКА",
  ];
  headers.forEach((title, i) => {
    paint(hdr.getCell(i + 1), title, { head: true });
  });

  payload.detail.forEach((line, i) => {
    const row = sheet.getRow(hdrR + 1 + i);
    if (line.showOrderColumns) {
      paint(row.getCell(1), line.zashla, { align: "right" });
      paint(row.getCell(2), line.otpr === "—" ? "" : line.otpr, { align: "right" });
      paint(row.getCell(3), line.orderNumber, { align: "center" });
      paint(row.getCell(4), line.patient);
      paint(row.getCell(5), line.doctor);
    } else {
      for (const c of [1, 2, 3, 4, 5]) {
        paint(row.getCell(c), "\u00A0");
      }
    }
    paint(row.getCell(6), line.description);
    paint(row.getCell(7), line.quantity, { align: "right" });
    paint(row.getCell(8), line.unitRub, { rub: true, align: "right" });
    paint(row.getCell(9), line.lineTotalRub, { rub: true, align: "right" });
    paint(
      row.getCell(10),
      line.discountPercent == null
        ? "\u00A0"
        : `${String(line.discountPercent).replace(".", ",")}%`,
      { align: "right" },
    );
  });

  const lastData = hdrR + Math.max(1, payload.detail.length);
  sheet.views = [{ state: "frozen", ySplit: 1, activeCell: "A1", showGridLines: true }];
  sheet.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printArea: `A1:J${lastData}`,
    horizontalDpi: 120,
    verticalDpi: 120,
  };
}
