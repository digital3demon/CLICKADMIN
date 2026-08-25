import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { ackCorrectionClarifyReply } from "@/lib/order-chat-correction-clarify.server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; correctionId: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { id: orderId, correctionId } = await ctx.params;
  if (!orderId?.trim() || !correctionId?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  const order = await prisma.order.findFirst({
    where: { id: orderId.trim(), tenantId },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }

  const ok = await ackCorrectionClarifyReply({
    db: prisma,
    orderId: order.id,
    correctionId,
  });
  if (!ok) {
    return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
