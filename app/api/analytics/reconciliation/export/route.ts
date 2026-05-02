import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReconciliationMonthPdfDocument } from "@/lib/analytics/reconciliation-month-pdf";
import { loadReconciliationMonthReport } from "@/lib/analytics/reconciliation-month.server";
import { requireFinancialAnalytics } from "@/lib/auth/analytics-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseIntInRange(
  value: string | null,
  min: number,
  max: number,
): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isInteger(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function monthLabel(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const gate = await requireFinancialAnalytics();
  if (gate instanceof NextResponse) return gate;

  const sp = new URL(req.url).searchParams;
  const year = parseIntInRange(sp.get("year"), 2020, 2100);
  const month = parseIntInRange(sp.get("month"), 1, 12);
  if (!year || !month) {
    return NextResponse.json(
      { error: "Укажите year и month (например: year=2026&month=5)" },
      { status: 400 },
    );
  }
  const compareYear = parseIntInRange(sp.get("compareYear"), 2020, 2100);
  const compareMonth = parseIntInRange(sp.get("compareMonth"), 1, 12);
  const format = (sp.get("format") ?? "xlsx").toLowerCase();
  if (format !== "xlsx" && format !== "pdf") {
    return NextResponse.json({ error: "format: xlsx | pdf" }, { status: 400 });
  }

  const report = await loadReconciliationMonthReport({
    year,
    month,
    compareYear,
    compareMonth,
  });

  if (format === "xlsx") {
    const wb = new ExcelJS.Workbook();
    wb.creator = "dental-lab-crm";
    wb.created = new Date();

    const ws = wb.addWorksheet("Сверки");
    ws.addRow(["Месяц", monthLabel(year, month)]);
    if (report.compareMonth) {
      ws.addRow([
        "Сравнение с",
        monthLabel(report.compareMonth.year, report.compareMonth.month),
      ]);
    }
    ws.addRow([]);
    ws.addRow(["Итого месяц", report.totals.monthTotalRub]);
    if (report.compareMonth) {
      ws.addRow(["Итого сравнение", report.totals.compareTotalRub ?? 0]);
      ws.addRow(["Разница", report.totals.deltaRub ?? 0]);
      ws.addRow(["Разница, %", report.totals.deltaPercent ?? ""]);
    }
    ws.addRow([]);
    ws.addRow([
      "Контрагент",
      "Периоды месяца",
      "Сумма месяца",
      "Периоды сравнения",
      "Сумма сравнения",
      "Разница",
      "Разница, %",
    ]);
    for (const row of report.rows) {
      ws.addRow([
        row.contractorName,
        row.periods.map((p) => `${p.periodLabelRu}: ${p.amountRub}`).join("; "),
        row.monthTotalRub,
        row.comparePeriods
          .map((p) => `${p.periodLabelRu}: ${p.amountRub}`)
          .join("; "),
        row.compareTotalRub ?? "",
        row.deltaRub ?? "",
        row.deltaPercent ?? "",
      ]);
    }

    const buf = await wb.xlsx.writeBuffer();
    const filename = `analytics-reconciliation-${monthLabel(year, month)}.xlsx`;
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const doc = React.createElement(ReconciliationMonthPdfDocument, { report });
  const pdfBuf = await renderToBuffer(doc as never);
  const pdfName = `analytics-reconciliation-${monthLabel(year, month)}.pdf`;
  return new NextResponse(Buffer.from(pdfBuf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfName}"`,
    },
  });
}
