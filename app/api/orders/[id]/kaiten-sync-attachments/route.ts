import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { syncUnpushedOrderAttachmentsToKaiten } from "@/lib/kaiten-sync";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const { id: orderIdRaw } = await ctx.params;
    const orderId = orderIdRaw?.trim() ?? "";
    if (!orderId) {
      return NextResponse.json({ error: "Некорректный id наряда" }, { status: 400 });
    }

    const session = await getSessionFromCookies();
    const tenantId = await orderTenantIdForSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const prisma = await getOrdersPrisma();
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true, kaitenCardId: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }
    if (!order.kaitenCardId) {
      return NextResponse.json({ ok: true, skipped: "no_kaiten_card" });
    }

    await syncUnpushedOrderAttachmentsToKaiten(orderId, prisma);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[kaiten-sync-attachments POST]", e);
    return NextResponse.json(
      { error: "Не удалось выгрузить вложения в Kaiten" },
      { status: 500 },
    );
  }
}
