import { describe, expect, it } from "vitest";
import { extractPdfPlainText } from "@/lib/extract-pdf-plain-text";
import type { ClinicReconciliationPdfPayload } from "@/lib/clinic-reconciliation-pdf-data";
import { renderClinicReconciliationPdfBuffer } from "@/lib/clinic-reconciliation-pdf-render";

const payload: ClinicReconciliationPdfPayload = {
  labLegalName: "ООО",
  clinicTitleLine: "ОП ООО «РЕМИ» (Атрибьют Клиник ОП) ИНН 7806419569",
  periodFromLabel: "16.08.26",
  periodToLabel: "01.09.26",
  summary: [
    { label: "1001 Сплинт сложный", quantity: 1, unitRub: 19000, totalRub: 19000 },
    {
      label: "2004 Единица цифрового моделирования",
      quantity: 4,
      unitRub: 3000,
      totalRub: 12000,
    },
  ],
  yellowRow: {
    totalUnits: 72,
    totalLineCount: 2,
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
  ],
};

describe("renderClinicReconciliationPdfBuffer", () => {
  it("кириллица сводки и детализации на месте", async () => {
    const buf = await renderClinicReconciliationPdfBuffer(payload);
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    const { text, error } = await extractPdfPlainText(buf);
    expect(error).toBeNull();
    expect(text).toMatch(/НАИМЕНОВАНИЕ ПОЗИЦИИ/);
    expect(text).toMatch(/1001 Сплинт сложный/);
    expect(text).toMatch(/ОП ООО «РЕМИ»/);
    expect(text).toMatch(/Всего к оплате/);
    expect(text).toMatch(/Тындик Т\.В\./);
    expect(text).toMatch(/Невский Денис\s+Дмитриевич/);
  }, 30_000);
});
