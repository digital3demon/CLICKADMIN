import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import {
  advanceLinkedOrderToNextColumn,
  getLinkedOrderColumnNeighbor,
} from "@/lib/kanban/advance-linked-order-column.server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";

export const dynamic = "force-dynamic";

/**
 * Соседние колонки CRM-канбана для наряда (кнопка «текущая → следующая» на QR-витрине).
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  const { id: orderId } = await ctx.params;
  if (!orderId?.trim()) {
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

  const neighbor = await getLinkedOrderColumnNeighbor(tenantId, order.id);
  if (!neighbor) {
    return NextResponse.json({
      ok: true,
      found: false,
      currentTitle: null,
      nextTitle: null,
      isLast: true,
    });
  }

  return NextResponse.json({
    ok: true,
    found: true,
    currentTitle: neighbor.currentTitle,
    nextTitle: neighbor.nextTitle,
    isLast: neighbor.isLast,
  });
}

/**
 * Перенос карточки наряда на следующую колонку CRM-канбана (+ зеркало в Kaiten при наличии).
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  const { id: orderId } = await ctx.params;
  if (!orderId?.trim()) {
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

  const actorLabel = userActivityDisplayLabel({
    mentionHandle: null,
    displayName: session.name?.trim() || null,
    email: session.email || null,
  });

  const advanced = await advanceLinkedOrderToNextColumn({
    tenantId,
    orderId: order.id,
    actorUserId: session.sub,
    actorLabel,
  });
  if (!advanced.ok) {
    const status =
      advanced.code === "not_found"
        ? 404
        : advanced.code === "last"
          ? 409
          : advanced.code === "conflict"
            ? 409
            : 400;
    return NextResponse.json({ error: advanced.error }, { status });
  }

  let kaitenSynced = false;
  let kaitenError: string | null = null;
  if (advanced.kaitenCardId != null) {
    try {
      const origin = new URL(_req.url).origin;
      const res = await fetch(
        `${origin}/api/orders/${encodeURIComponent(order.id)}/kaiten`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: _req.headers.get("cookie") || "",
          },
          body: JSON.stringify({
            columnTitle: advanced.toTitle,
            sortOrder: advanced.sortOrder,
          }),
        },
      );
      if (res.ok) {
        kaitenSynced = true;
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        kaitenError = data.error ?? "Kaiten не принял перенос";
      }
    } catch {
      kaitenError = "Сеть: колонка в Kaiten могла не обновиться";
    }
  }

  return NextResponse.json({
    ok: true,
    fromTitle: advanced.fromTitle,
    toTitle: advanced.toTitle,
    kaitenSynced,
    kaitenError,
  });
}
