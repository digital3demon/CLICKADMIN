import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { parseAnalyticsRange } from "@/lib/analytics/range";
import {
  loadContractorsReport,
  loadFinanceReport,
  loadPriceItemsReport,
  loadWarehouseReport,
} from "@/lib/analytics/reports.server";
import { requireFinancialAnalytics } from "@/lib/auth/analytics-guard";

export const dynamic = "force-dynamic";

const TYPES = ["finance", "price", "contractors", "warehouse"] as const;
type ExportType = (typeof TYPES)[number];

function isExportType(v: string | null | undefined): v is ExportType {
  return v != null && (TYPES as readonly string[]).includes(v);
}

export async function GET(req: Request) {
  const gate = await requireFinancialAnalytics();
  if (gate instanceof NextResponse) return gate;

  const sp = new URL(req.url).searchParams;
  const range = parseAnalyticsRange(sp);
  if ("error" in range) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }
  const { from, to } = range;
  const typeRaw = sp.get("type")?.trim();
  if (!isExportType(typeRaw)) {
    return NextResponse.json(
      { error: "Укажите type: finance | price | contractors | warehouse" },
      { status: 400 },
    );
  }
  const type = typeRaw;

  const wb = new ExcelJS.Workbook();
  wb.creator = "dental-lab-crm";
  wb.created = new Date();

  const fromLabel = from.toISOString().slice(0, 10);
  const toLabel = to.toISOString().slice(0, 10);
  const period = `${fromLabel}_${toLabel}`;

  if (type === "finance") {
    const data = await loadFinanceReport(from, to);
    const ws = wb.addWorksheet("Финансы");
    ws.addRow(["Период", fromLabel, "—", toLabel]);
    ws.addRow([]);
    ws.addRow(["Выручка, ₽", data.totals.revenue]);
    ws.addRow(["Заказов (без отмен)", data.totals.orders]);
    ws.addRow(["Отменённых", data.totals.cancelled]);
    ws.addRow(["Средний чек, ₽", data.totals.avgCheck]);
    ws.addRow(["Коррекций, шт", data.totals.correctionOrders]);
    ws.addRow(["Коррекции, выручка ₽", data.totals.correctionRevenue]);
    ws.addRow(["Переделок, шт", data.totals.reworkOrders]);
    ws.addRow(["Переделки, выручка ₽", data.totals.reworkRevenue]);
    ws.addRow([]);
    ws.addRow(["Позиции переделок"]);
    ws.addRow(["Код", "Позиция", "Переделок (нарядов)", "Строк", "Кол-во"]);
    for (const row of data.reworkTopItems ?? []) {
      ws.addRow([row.code, row.name, row.reworkOrders, row.lineCount, row.quantity]);
    }
    ws.addRow([]);
    ws.addRow(["Дата", "Выручка, ₽", "Заказов"]);
    for (const row of data.series) {
      ws.addRow([row.date, row.revenue, row.orders]);
    }
  }

  if (type === "price") {
    const data = await loadPriceItemsReport(from, to);
    const ws = wb.addWorksheet("Прайс");
    ws.addRow(["Период", fromLabel, "—", toLabel]);
    ws.addRow([]);
    ws.addRow(["Код", "Название", "Заказов", "Строк", "Выручка, ₽"]);
    for (const r of data.rows) {
      ws.addRow([r.code, r.name, r.orderCount, r.lineCount, r.revenue]);
    }
  }

  if (type === "contractors") {
    const data = await loadContractorsReport(from, to);
    const wc = wb.addWorksheet("Клиники");
    wc.addRow(["Период", fromLabel, "—", toLabel]);
    wc.addRow([]);
    wc.addRow([
      "Клиника",
      "Заказов",
      "Выручка, ₽",
      "Заказов / мес (оценка)",
    ]);
    for (const r of data.clinics) {
      wc.addRow([
        r.clinicName,
        r.orderCount,
        r.revenue,
        r.ordersPerMonth,
      ]);
    }
    const wd = wb.addWorksheet("Врачи");
    wd.addRow(["Период", fromLabel, "—", toLabel]);
    wd.addRow([]);
    wd.addRow(["Врач", "Заказов", "Выручка, ₽", "Заказов / мес (оценка)"]);
    for (const r of data.doctors) {
      wd.addRow([
        r.doctorName,
        r.orderCount,
        r.revenue,
        r.ordersPerMonth,
      ]);
    }
  }

  if (type === "warehouse") {
    const data = await loadWarehouseReport(from, to);
    const wk = wb.addWorksheet("По типам");
    wk.addRow(["Период", fromLabel, "—", toLabel]);
    wk.addRow(["Всего движений", data.movementCount]);
    wk.addRow([]);
    wk.addRow(["Тип", "Операций", "Σ кол-во", "Σ себестоимость, ₽"]);
    for (const r of data.byKind) {
      wk.addRow([r.label, r.count, r.quantityAbs, r.totalCostRub]);
    }
    const wi = wb.addWorksheet("Позиции");
    wi.addRow([
      "Позиция",
      "Ед.",
      "Операций",
      "Σ |кол-во|",
      "Σ себестоимость, ₽",
    ]);
    for (const r of data.topItems) {
      wi.addRow([
        r.name,
        r.unit,
        r.movements,
        r.quantityAbs,
        r.costRub,
      ]);
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  const name = `analytics-${type}-${period}.xlsx`;
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
    },
  });
}
