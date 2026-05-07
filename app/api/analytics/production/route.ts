import { NextResponse } from "next/server";
import { parseAnalyticsRange } from "@/lib/analytics/range";
import { loadProductionReworkReport } from "@/lib/analytics/reports.server";
import { requireFinancialAnalytics } from "@/lib/auth/analytics-guard";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const gate = await requireFinancialAnalytics();
    if (gate instanceof NextResponse) return gate;

    const tenantId = await getTenantIdForSession(gate);
    if (!tenantId) {
      return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
    }

    const sp = new URL(req.url).searchParams;
    const range = parseAnalyticsRange(sp);
    if ("error" in range) {
      return NextResponse.json({ error: range.error }, { status: 400 });
    }
    const data = await loadProductionReworkReport(tenantId, range.from, range.to);
    return NextResponse.json(data);
  } catch (e) {
    console.error("[analytics/production]", e);
    return NextResponse.json(
      { error: "Не удалось построить отчёт по производству. Проверьте логи." },
      { status: 500 },
    );
  }
}
