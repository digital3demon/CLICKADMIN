import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import {
  computeNextOrderNumber,
  isArchivedOrderNumberPlaceholder,
} from "@/lib/order-number";

export const dynamic = "force-dynamic";

/** Вернуть наряд из архива (без восстановления карточки Kaiten). */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const orderId = id?.trim() ?? "";
  if (!orderId) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const row = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, archivedAt: true, orderNumber: true, tenantId: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }
  if (row.archivedAt == null) {
    return NextResponse.json({ error: "Наряд не в архиве" }, { status: 400 });
  }

  const nextNumber =
    row.orderNumber && isArchivedOrderNumberPlaceholder(row.orderNumber)
      ? await computeNextOrderNumber(prisma, row.tenantId)
      : undefined;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      archivedAt: null,
      ...(nextNumber ? { orderNumber: nextNumber } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
