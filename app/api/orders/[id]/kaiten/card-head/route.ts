import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { getKaitenRestAuth } from "@/lib/kaiten-rest";
import { syncKaitenCardHeadInboundForOrderIds } from "@/lib/kanban/kaiten-inbound-card-head";

export const dynamic = "force-dynamic";

/**
 * Срок этапа, срочность, ответственные и участники с карточки Kaiten
 * (как GET /kaiten/chat, но шапка карточки). Пишет в kanbanAppStateV3.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = getKaitenRestAuth();
  if (!auth) {
    return NextResponse.json({ error: "Kaiten не настроен" }, { status: 503 });
  }

  const { id: orderId } = await ctx.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  const session = await getSessionFromCookies();
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const order = await prisma.order.findFirst({
    where: { id: orderId.trim(), tenantId },
    select: { id: true, kaitenCardId: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }
  if (order.kaitenCardId == null) {
    return NextResponse.json(
      { error: "К карточке Kaiten не привязано" },
      { status: 400 },
    );
  }

  try {
    const head = await syncKaitenCardHeadInboundForOrderIds(
      prisma,
      auth,
      tenantId,
      [order.id],
    );
    const row = head.byOrderId[order.id];
    if (!row) {
      return NextResponse.json({
        ok: true,
        assignees: [],
        participants: [],
        stageDue: "",
        urgent: false,
        rateLimited: head.rateLimited,
      });
    }
    return NextResponse.json({
      ok: true,
      ...row,
      rateLimited: head.rateLimited,
    });
  } catch (e) {
    console.error("[kaiten card-head GET]", e);
    return NextResponse.json(
      { error: "Не удалось загрузить шапку карточки Kaiten" },
      { status: 502 },
    );
  }
}
