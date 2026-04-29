import { NextResponse } from "next/server";
import { parseAnalyticsRange } from "@/lib/analytics/range";
import { loadContractorsReport } from "@/lib/analytics/reports.server";
import { requireFinancialAnalytics } from "@/lib/auth/analytics-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await requireFinancialAnalytics();
  if (gate instanceof NextResponse) return gate;

  const sp = new URL(req.url).searchParams;
  const range = parseAnalyticsRange(sp);
  if ("error" in range) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }
  const data = await loadContractorsReport(range.from, range.to);
  return NextResponse.json(data);
}
