import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

/** POST — пользователь открыл чат Kaiten и подтвердил просмотр упоминания лаборатории для этого наряда. */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }
  const { id: orderId } = await ctx.params;
  const oid = orderId?.trim();
  if (!oid) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const db = await getOrdersPrisma();
  const order = await db.order.findFirst({
    where: { id: oid, tenantId },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }

  await db.orderKaitenLabMentionAck.upsert({
    where: {
      userId_orderId: { userId: session.sub, orderId: oid },
    },
    create: {
      tenantId,
      userId: session.sub,
      orderId: oid,
      ackAt: new Date(),
    },
    update: { ackAt: new Date() },
  });

  revalidatePath("/orders");

  return NextResponse.json({ ok: true });
}
