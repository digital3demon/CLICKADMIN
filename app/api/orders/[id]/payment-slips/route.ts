import { OrderAttachmentScope } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Список платёжек (скрины/фото), не смешивается с общими вложениями наряда. */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id: orderId } = await ctx.params;
    const prisma = await getOrdersPrisma();
    const session = await getSessionFromCookies();
    const tenantId = await orderTenantIdForSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }
    const slips = await prisma.orderAttachment.findMany({
      where: { orderId, scope: OrderAttachmentScope.PAYMENT_SLIP },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        size: true,
        createdAt: true,
      },
    });
    return NextResponse.json(slips);
  } catch (e) {
    console.error("[payment-slips GET]", e);
    return NextResponse.json(
      { error: "Не удалось загрузить платёжки" },
      { status: 500 },
    );
  }
}
