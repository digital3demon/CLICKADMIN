import { NextResponse } from "next/server";
import { searchProductionCalendarLocations } from "@/lib/analytics/production-calendar-locations";
import { requireFinancialAnalytics } from "@/lib/auth/analytics-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await requireFinancialAnalytics();
  if (gate instanceof NextResponse) return gate;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const locations = searchProductionCalendarLocations(q, 30);
  return NextResponse.json({ locations });
}
