import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { ensureCrmKanbanLinkedCardForOrder } from "@/lib/kanban/ensure-linked-order-card.server";
import { getKaitenCardWebUrl } from "@/lib/kaiten-card-web-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Статус присутствия карточки наряда: CRM-канбан и отдельно Kaiten.
 * При отсутствии CRM-карточки у eligible наряда — self-heal ensure.
 */
export async function GET(_req: Request, ctx: Ctx) {
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
      select: {
        id: true,
        kaitenCardId: true,
        status: true,
        archivedAt: true,
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }

    let ensureResult = await ensureCrmKanbanLinkedCardForOrder(orderId, tenantId);
    if (!ensureResult.hasCard && ensureResult.reason === "concurrent_write") {
      ensureResult = await ensureCrmKanbanLinkedCardForOrder(orderId, tenantId);
    }

    const kaitenCardId =
      order.kaitenCardId != null && Number.isFinite(order.kaitenCardId)
        ? order.kaitenCardId
        : null;
    const kaitenUrl =
      kaitenCardId != null ? getKaitenCardWebUrl(kaitenCardId) : null;

    return NextResponse.json({
      kanban: {
        hasCard: ensureResult.hasCard === true,
        boardId: ensureResult.boardId ?? null,
        cardId: ensureResult.cardId ?? null,
        columnTitle: ensureResult.columnTitle ?? null,
        url: ensureResult.hasCard ? kanbanOrderDeepLinkPath(orderId) : null,
      },
      kaiten: {
        hasCard: kaitenCardId != null,
        kaitenCardId,
        url: kaitenUrl,
      },
      ensured: ensureResult.ensured === true,
      ensureReason: ensureResult.reason ?? null,
    });
  } catch (e) {
    console.error("[board-presence GET]", e);
    return NextResponse.json(
      { error: "Не удалось проверить карточки канбана/Kaiten" },
      { status: 500 },
    );
  }
}

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

    const ensureResult = await ensureCrmKanbanLinkedCardForOrder(orderId, tenantId);
    if (!ensureResult.hasCard) {
      return NextResponse.json(
        {
          error: "Не удалось создать карточку в канбане CRM",
          reason: ensureResult.reason ?? null,
        },
        { status: 422 },
      );
    }

    const kaitenCardId =
      order.kaitenCardId != null && Number.isFinite(order.kaitenCardId)
        ? order.kaitenCardId
        : null;

    return NextResponse.json({
      ok: true,
      kanban: {
        hasCard: true,
        boardId: ensureResult.boardId ?? null,
        cardId: ensureResult.cardId ?? null,
        columnTitle: ensureResult.columnTitle ?? null,
        url: kanbanOrderDeepLinkPath(orderId),
      },
      kaiten: {
        hasCard: kaitenCardId != null,
        kaitenCardId,
        url: kaitenCardId != null ? getKaitenCardWebUrl(kaitenCardId) : null,
      },
      ensured: true,
    });
  } catch (e) {
    console.error("[board-presence POST]", e);
    return NextResponse.json(
      { error: "Не удалось создать карточку в канбане CRM" },
      { status: 500 },
    );
  }
}
