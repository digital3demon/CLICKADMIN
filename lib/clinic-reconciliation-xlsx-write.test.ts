import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { writeReconciliationSheet } from "@/lib/clinic-reconciliation-xlsx-write";
import type { ClinicReconciliationPdfPayload } from "@/lib/clinic-reconciliation-pdf-data";

const payload: ClinicReconciliationPdfPayload = {
  labLegalName: "ООО",
  clinicTitleLine: "ОП ООО «РЕМИ» ИНН 7806419569",
  periodFromLabel: "16.08.26",
  periodToLabel: "01.09.26",
  summary: [
    { label: "1001 Сплинт сложный", quantity: 1, unitRub: 19000, totalRub: 19000 },
  ],
  yellowRow: {
    totalUnits: 72,
    totalLineCount: 1,
    baseTotalRub: 406770,
    discountedTotalRub: 403020,
    vatRub: 19191.43,
  },
  detail: [
    {
      showOrderColumns: true,
      zashla: "28.07.26",
      otpr: "21.08.26",
      orderNumber: "2607-386",
      patient: "Тындик Т.В.",
      doctor: "Невский Денис Дмитриевич",
      description: "2004 Единица цифрового моделирования",
      quantity: 4,
      unitRub: 3000,
      baseTotalRub: 12000,
      lineTotalRub: 12000,
      discountPercent: null,
    },
    {
      showOrderColumns: false,
      zashla: "28.07.26",
      otpr: "21.08.26",
      orderNumber: "2607-386",
      patient: "Тындик Т.В.",
      doctor: "Невский Денис Дмитриевич",
      description: "5003 Модель неразборная/диагностическая",
      quantity: 1,
      unitRub: 1500,
      baseTotalRub: 1500,
      lineTotalRub: 1500,
      discountPercent: 5,
    },
  ],
};

describe("writeReconciliationSheet", () => {
  it("после записи и чтения кириллица на месте, не пустой лист", async () => {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("tmp");
    writeReconciliationSheet(sheet, payload);
    const buf = await wb.xlsx.writeBuffer();
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(buf as unknown as ArrayBuffer);
    const s = wb2.worksheets[0]!;
    expect(s.getRow(1).getCell(1).value).toBe("НАИМЕНОВАНИЕ ПОЗИЦИИ");
    expect(s.getRow(2).getCell(1).value).toBe("1001 Сплинт сложный");
    expect(s.getRow(2).getCell(7).value).toBe(1);
    expect(s.getRow(3).getCell(6).value).toBe("ОП ООО «РЕМИ» ИНН 7806419569");
    expect(s.getRow(3).getCell(8).value).toBe("\u00A0");
    expect(s.getRow(3).getCell(9).value).toBe(406770);
    expect(s.getRow(3).getCell(10).value).toBe(403020);
    expect(s.getRow(3).getCell(9).alignment?.horizontal).toBe("right");
    expect(s.getRow(6).getCell(1).value).toBe("Дата когда зашла работа");
    expect(s.getRow(6).getCell(2).value).toBe("Дата отправки работы");
    expect(s.getRow(6).getCell(10).value).toBe("СКИДКА");
    expect(s.getColumn(10).hidden).not.toBe(true);
    expect(s.getRow(7).getCell(4).value).toBe("Тындик Т.В.");
    expect(s.getRow(7).getCell(6).value).toBe(
      "2004 Единица цифрового моделирования",
    );
    expect(s.getRow(8).getCell(6).value).toBe(
      "5003 Модель неразборная/диагностическая",
    );
    expect(s.getRow(8).getCell(10).value).toBe("5%");
    expect(s.getRow(8).getCell(1).border?.left?.style).toBe("thin");
    expect(s.getRow(8).getCell(5).border?.right?.style).toBe("thin");
    expect(s.getColumn(8).width).toBeGreaterThanOrEqual(16);
    expect(s.getColumn(10).width).toBeGreaterThanOrEqual(12);
  });
});
