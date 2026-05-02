import { NextResponse } from "next/server";
import {
  fetchReconciliationRows,
  parseDateRangeUTC,
} from "@/lib/clinic-finance";
import { getPrisma } from "@/lib/get-prisma";
/** JSON-строки сверки за период (для вкладки «Финансы»). */
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

    const { included, excluded } = await fetchReconciliationRows(id, range);

    const ser = (rows: typeof included) =>
      rows.map((r) => ({
        orderId: r.orderId,
        clinicName: r.clinicName,
        doctorName: r.doctorName,
        patientName: r.patientName,
        orderCreatedAt: r.orderCreatedAt.toISOString(),
        workReceivedAt: r.workReceivedAt?.toISOString() ?? null,
        approvedAt: r.approvedAt?.toISOString() ?? null,
        sentAt: r.sentAt?.toISOString() ?? null,
        orderNumber: r.orderNumber,
        labWorkStatus: r.labWorkStatus,
        attentionRequired: r.attentionRequired,
        description: r.description,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        lineTotal: r.lineTotal,
      }));

    return NextResponse.json({
      included: ser(included),
      excluded: ser(excluded),
    });
  } catch (e) {
    console.error("[GET reconciliation-lines]", e);
    return NextResponse.json(
      { error: "Не удалось загрузить строки" },
      { status: 500 },
    );
  }
}
