import ExcelJS from "exceljs";
import { parseDateRangeUTC } from "@/lib/clinic-finance";
import { buildClinicReconciliationPdfPayload } from "@/lib/clinic-reconciliation-pdf-data";
import { writeReconciliationSheet } from "@/lib/clinic-reconciliation-xlsx-write";

type DateRangeUtc = { from: Date; to: Date };

/**
 * Выгрузка сверки: книга с нуля (без шаблона), те же данные что PDF.
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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "dental-lab-crm";
  const sheet = workbook.addWorksheet("Сверка");
  writeReconciliationSheet(sheet, payload);

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
