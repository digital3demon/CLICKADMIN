import { NextResponse } from "next/server";
import { parseAnalyticsRange } from "@/lib/analytics/range";
import { loadPriceItemsReport } from "@/lib/analytics/reports.server";
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
    const data = await loadPriceItemsReport(range.from, range.to);
    return NextResponse.json(data);
  } catch (e) {
    console.error("[analytics/price-items]", e);
    return NextResponse.json(
      { error: "Не удалось построить отчёт. Проверьте БД и логи сервера." },
      { status: 500 },
    );
  }
}
