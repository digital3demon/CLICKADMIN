import { NextResponse } from "next/server";
import { parseAnalyticsRange } from "@/lib/analytics/range";
import { parseDeadlinesScheduleFromSearchParams } from "@/lib/analytics/deadlines-schedule";
import { loadWorkDeadlinesReport } from "@/lib/analytics/deadlines-report.server";
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
    const data = await loadWorkDeadlinesReport(range.from, range.to, schedule);
    return NextResponse.json(data);
  } catch (e) {
    console.error("[analytics/deadlines/work]", e);
    return NextResponse.json(
      { error: "Не удалось построить отчёт по срокам работ." },
      { status: 500 },
    );
  }
}
