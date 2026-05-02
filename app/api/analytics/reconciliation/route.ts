import { NextResponse } from "next/server";
import { loadReconciliationMonthReport } from "@/lib/analytics/reconciliation-month.server";
import { requireFinancialAnalytics } from "@/lib/auth/analytics-guard";

export const dynamic = "force-dynamic";

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

export async function GET(req: Request) {
  try {
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
    const data = await loadReconciliationMonthReport({
      year,
      month,
      compareYear,
      compareMonth,
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[analytics/reconciliation]", e);
    return NextResponse.json(
      { error: "Не удалось построить отчёт по сверкам" },
      { status: 500 },
    );
  }
}
