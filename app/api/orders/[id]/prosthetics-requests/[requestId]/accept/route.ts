import { NextResponse } from "next/server";
import { canAcceptOrderChatCorrections } from "@/lib/auth/permissions";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  closeOrderProstheticsRequestPair,
  reopenOrderProstheticsRequestPair,
} from "@/lib/order-chat-inbox-resolve-pair.server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

/**
 * «Подтвердил»: заявка принята (resolvedAt), ещё не «Заказал».
 * Kaiten «протетика в пути» и галочка наряда — на шаге ordered.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; requestId: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (!canAcceptOrderChatCorrections(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { id: orderId, requestId } = await ctx.params;
  if (!orderId?.trim() || !requestId?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  const closed = await closeOrderProstheticsRequestPair(
    prisma,
    orderId,
    requestId,
    "accept",
    session.sub,
  );
  if (!closed.ok) {
    return NextResponse.json({ error: closed.error }, { status: closed.status });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId.trim(), tenantId },
    select: { id: true },
  });
  if (!order) {
    await reopenOrderProstheticsRequestPair(prisma, closed, "accept");
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
