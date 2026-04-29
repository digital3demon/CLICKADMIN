import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  try {
    const order = await (await getPrisma()).order.findUnique({
      where: { id: id.trim() },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
    }

    const revisions = await (await getPrisma()).orderRevision.findMany({
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
