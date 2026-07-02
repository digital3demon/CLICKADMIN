import { NextResponse } from "next/server";
import { parseAnalyticsRange } from "@/lib/analytics/range";
import {
  parseAdminSlaHours,
  parseDeadlinesScheduleFromSearchParams,
} from "@/lib/analytics/deadlines-schedule";
import { loadAdminDeadlinesReport } from "@/lib/analytics/deadlines-report.server";
import { requireFinancialAnalytics } from "@/lib/auth/analytics-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const gate = await requireFinancialAnalytics();
    if (gate instanceof NextResponse) return gate;

    const sp = new URL(req.url).searchParams;
    const range = parseAnalyticsRange(sp);
    if ("error" in range) {
      return NextResponse.json({ error: range.error }, { status: 400 });
    }
    const schedule = parseDeadlinesScheduleFromSearchParams(sp);
    const slaHours = parseAdminSlaHours(sp);
    const data = await loadAdminDeadlinesReport(
      range.from,
      range.to,
      schedule,
      slaHours,
    );
    return NextResponse.json(data);
  } catch (e) {
    console.error("[analytics/deadlines/admin]", e);
    return NextResponse.json(
      { error: "Не удалось построить отчёт по срокам (Админ)." },
      { status: 500 },
    );
  }
}
