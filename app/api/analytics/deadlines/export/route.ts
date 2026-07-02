import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { parseAnalyticsRange } from "@/lib/analytics/range";
import {
  formatDurationMinutesRu,
  parseAdminSlaHours,
  parseDeadlinesScheduleFromSearchParams,
} from "@/lib/analytics/deadlines-schedule";
import {
  loadAdminDeadlinesReport,
  loadWorkDeadlinesReport,
} from "@/lib/analytics/deadlines-report.server";
import { requireFinancialAnalytics } from "@/lib/auth/analytics-guard";

export const dynamic = "force-dynamic";

const TYPES = ["admin", "work"] as const;
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
  const typeRaw = sp.get("type")?.trim();
  if (!isExportType(typeRaw)) {
    return NextResponse.json(
      { error: "Укажите type: admin | work" },
      { status: 400 },
    );
  }
  const schedule = parseDeadlinesScheduleFromSearchParams(sp);
  const { from, to } = range;
  const fromLabel = from.toISOString().slice(0, 10);
  const toLabel = to.toISOString().slice(0, 10);

  const wb = new ExcelJS.Workbook();
  wb.creator = "dental-lab-crm";
  wb.created = new Date();

  if (typeRaw === "admin") {
    const slaHours = parseAdminSlaHours(sp);
    const data = await loadAdminDeadlinesReport(from, to, schedule, slaHours);
    const ws = wb.addWorksheet("Сроки — Админ");
    ws.addRow(["Период", fromLabel, "—", toLabel]);
    ws.addRow(["Порог SLA, ч", slaHours]);
    ws.addRow(["Рабочие часы", `${schedule.workStartHm}–${schedule.workEndHm}`]);
    ws.addRow(["Страна", schedule.country]);
    ws.addRow(["Регион", schedule.regionId ?? "—"]);
    ws.addRow([]);
    ws.addRow([
      "Средний срок за всё время",
      formatDurationMinutesRu(data.allTimeAverageMinutes),
    ]);
    ws.addRow([
      "Средний срок за период",
      formatDurationMinutesRu(data.periodAverageMinutes),
    ]);
    ws.addRow([]);
    ws.addRow(["Категория", "Шт", "%"]);
    ws.addRow(["Раньше", data.buckets.early, data.bucketPercents.early]);
    ws.addRow(["Вовремя", data.buckets.onTime, data.bucketPercents.onTime]);
    ws.addRow(["Позже", data.buckets.late, data.bucketPercents.late]);
    ws.addRow(["Всего", data.buckets.total, 100]);
  } else {
    const data = await loadWorkDeadlinesReport(from, to, schedule);
    const ws = wb.addWorksheet("Сроки работ");
    ws.addRow(["Период", fromLabel, "—", toLabel]);
    ws.addRow(["Рабочие часы", `${schedule.workStartHm}–${schedule.workEndHm}`]);
    ws.addRow(["Страна", schedule.country]);
    ws.addRow(["Регион", schedule.regionId ?? "—"]);
    ws.addRow([]);
    ws.addRow([
      "Средний фактический срок (всё время)",
      formatDurationMinutesRu(data.allTimeAverageMinutes),
    ]);
    ws.addRow([
      "Средний фактический срок (период)",
      formatDurationMinutesRu(data.periodAverageMinutes),
    ]);
    ws.addRow([]);
    ws.addRow([
      "Код",
      "Название",
      "Нарядов",
      "Строк",
      "Норматив (дн)",
      "Средний срок",
      "Раньше",
      "Вовремя",
      "Позже",
    ]);
    for (const row of data.rows) {
      ws.addRow([
        row.code,
        row.name,
        row.orderCount,
        row.lineCount,
        row.leadWorkingDays ?? "—",
        formatDurationMinutesRu(row.averageDurationMinutes),
        row.early,
        row.onTime,
        row.late,
      ]);
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  const filename = `analytics-deadlines-${typeRaw}_${fromLabel}_${toLabel}.xlsx`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
