import ExcelJS from "exceljs";
import { fetchReconciliationRows, parseDateRangeUTC } from "@/lib/clinic-finance";

type DateRangeUtc = { from: Date; to: Date };

export async function buildClinicReconciliationXlsxBuffer(
  clinicId: string,
  _clinicName: string,
  range: DateRangeUtc,
): Promise<{ buffer: Buffer; fromStr: string; toStr: string }> {
  const fromStr = range.from.toISOString().slice(0, 10);
  const toStr = range.to.toISOString().slice(0, 10);

  const { included, excluded } = await fetchReconciliationRows(clinicId, range);
  let sum = 0;
  let sumExcluded = 0;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Сверка");

  sheet.addRow([
    "Врач",
    "Дата заказа",
    "Номер наряда",
    "Позиция",
    "Кол-во",
    "Цена за ед., руб.",
    "Сумма, руб.",
  ]);

  for (const r of included) {
    sum += r.lineTotal;
    sheet.addRow([
      r.doctorName,
      r.orderCreatedAt.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      r.orderNumber,
      r.description,
      r.quantity,
      r.unitPrice ?? "",
      r.lineTotal,
    ]);
  }

  sheet.addRow([]);
  sheet.addRow([
    "Итого",
    "",
    "",
    "",
    "",
    "",
    Math.round(sum * 100) / 100,
  ]);

  if (excluded.length > 0) {
    const sheetEx = workbook.addWorksheet("Исключено из сверки");
    sheetEx.addRow([
      "Врач",
      "Дата заказа",
      "Номер наряда",
      "Позиция",
      "Кол-во",
      "Цена за ед., руб.",
      "Сумма, руб.",
      "Примечание",
    ]);
    for (const r of excluded) {
      sumExcluded += r.lineTotal;
      sheetEx.addRow([
        r.doctorName,
        r.orderCreatedAt.toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        r.orderNumber,
        r.description,
        r.quantity,
        r.unitPrice ?? "",
        r.lineTotal,
        "В периоде, но не в актуальной сверке (см. карточку наряда / вкладка Финансы)",
      ]);
    }
    sheetEx.addRow([]);
    sheetEx.addRow([
      "Итого исключено",
      "",
      "",
      "",
      "",
      "",
      Math.round(sumExcluded * 100) / 100,
      "",
    ]);
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
  const r = parseDateRangeUTC(fromStr, toStr);
  return r;
}
