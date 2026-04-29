import { NextResponse } from "next/server";
import {
  listClinicReconciliationExcludedOrders,
  parseDateRangeUTC,
} from "@/lib/clinic-finance";
import { getPrisma } from "@/lib/get-prisma";
/**
 * Наряды за период, исключённые из основной сверки (для вкладки «Финансы» клиники).
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const url = new URL(req.url);
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const range = parseDateRangeUTC(from, to);
    if (!range) {
      return NextResponse.json(
        { error: "Укажите период: from и to в формате YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const clinic = await (await getPrisma()).clinic.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!clinic) {
      return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
    }

    const orders = await listClinicReconciliationExcludedOrders(id, range);

    return NextResponse.json({
      orders,
      periodEndIso: range.to.toISOString(),
    });
  } catch (e) {
    console.error("[GET reconciliation-exclusions]", e);
    return NextResponse.json(
      { error: "Не удалось загрузить список" },
      { status: 500 },
    );
  }
}
