import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
/** Список автосверок клиники (без файла). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const clinic = await (await getPrisma()).clinic.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!clinic) {
      return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
    }

    const rows = await (await getPrisma()).clinicReconciliationSnapshot.findMany({
      where: { clinicId: id },
      orderBy: { createdAt: "desc" },
      take: 36,
      select: {
        id: true,
        slot: true,
        periodFromStr: true,
        periodToStr: true,
        periodLabelRu: true,
        legalEntityLabel: true,
        createdAt: true,
        dismissedAt: true,
      },
    });

    return NextResponse.json({ snapshots: rows });
  } catch (e) {
    console.error("[GET reconciliation-snapshots]", e);
    return NextResponse.json(
      { error: "Не удалось загрузить список" },
      { status: 500 },
    );
  }
}
