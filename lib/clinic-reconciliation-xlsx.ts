import ExcelJS from "exceljs";
import { fetchReconciliationRows, parseDateRangeUTC } from "@/lib/clinic-finance";

type DateRangeUtc = { from: Date; to: Date };

export async function buildClinicReconciliationXlsxBuffer(
  clinicId: string,
  _clinicName: string,
  range: DateRangeUtc,
  selectedOrderIds?: string[] | null,
): Promise<{ buffer: Buffer; fromStr: string; toStr: string }> {
  const fromStr = range.from.toISOString().slice(0, 10);
  const toStr = range.to.toISOString().slice(0, 10);

  const { included, excluded } = await fetchReconciliationRows(clinicId, range);
  const selected = new Set(
    (selectedOrderIds ?? [])
      .map((x) => String(x || "").trim())
      .filter(Boolean),
  );
  const includedRows =
    selected.size > 0
      ? included.filter((x) => selected.has(x.orderId))
      : included;
  const excludedRows =
    selected.size > 0
      ? excluded.filter((x) => selected.has(x.orderId))
      : excluded;
  let sum = 0;
  let sumExcluded = 0;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Сверка");

  const dateRu = (iso: Date | null) =>
    iso
      ? iso.toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

  sheet.addRow([
    "Наряд",
    "Клиника",
    "Доктора",
    "Пациент",
    "Дата когда работа зашла",
    "Когда работу согласовали",
    "Дата отправки",
    "Позиция",
    "Количество",
    "Цена",
    "Сумма",
  ]);

  for (const r of includedRows) {
    sum += r.lineTotal;
    sheet.addRow([
      r.orderNumber,
      r.clinicName,
      r.doctorName,
      r.patientName ?? "",
      dateRu(r.workReceivedAt ?? r.orderCreatedAt),
      dateRu(r.approvedAt),
      dateRu(r.sentAt),
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
    "",
    "",
    "",
    "",
    Math.round(sum * 100) / 100,
  ]);

  if (excludedRows.length > 0) {
    const sheetEx = workbook.addWorksheet("Исключено из сверки");
    sheetEx.addRow([
      "Наряд",
      "Клиника",
      "Доктора",
      "Пациент",
      "Дата когда работа зашла",
      "Когда работу согласовали",
      "Дата отправки",
      "Позиция",
      "Количество",
      "Цена",
      "Сумма",
      "Примечание",
    ]);
    for (const r of excludedRows) {
      sumExcluded += r.lineTotal;
      sheetEx.addRow([
        r.orderNumber,
        r.clinicName,
        r.doctorName,
        r.patientName ?? "",
        dateRu(r.workReceivedAt ?? r.orderCreatedAt),
        dateRu(r.approvedAt),
        dateRu(r.sentAt),
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
