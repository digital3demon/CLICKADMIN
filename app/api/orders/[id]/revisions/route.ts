import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  try {
    const prisma = await getOrdersPrisma();
    const order = await prisma.order.findUnique({
      where: { id: id.trim() },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
    }

    const revisions = await prisma.orderRevision.findMany({
      where: { orderId: id.trim() },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        actorLabel: true,
        summary: true,
        kind: true,
      },
    });

    return NextResponse.json({ revisions });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить историю" },
      { status: 500 },
    );
  }
}
