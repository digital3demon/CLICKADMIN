import { NextResponse } from "next/server";
import { canEditOrders } from "@/lib/auth/permissions";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  applyOrderListAdminMemo,
  fetchOrderListAdminMemoHistory,
} from "@/lib/order-list-admin-memo.server";
import { normalizeOrderListAdminMemoInput } from "@/lib/order-list-admin-memo";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

export const dynamic = "force-dynamic";

async function assertMemoAccess(session: Awaited<ReturnType<typeof getSessionFromCookies>>) {
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const moduleAccess = await getEffectiveModuleAccess(tenantId, session.role);
  if (!canEditOrders(session.role, moduleAccess)) {
    return NextResponse.json(
      { error: "Нет прав на редактирование пометки" },
      { status: 403 },
    );
  }
  return { session, tenantId };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  const access = await assertMemoAccess(session);
  if (access instanceof NextResponse) return access;

  const { id } = await ctx.params;
  const orderId = id?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId: access.tenantId },
    select: { listAdminMemo: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }

  const history = await fetchOrderListAdminMemoHistory(
    prisma,
    orderId,
    access.tenantId,
  );

  return NextResponse.json(
    {
      memo: normalizeOrderListAdminMemoInput(order.listAdminMemo),
      history,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  const access = await assertMemoAccess(session);
  if (access instanceof NextResponse) return access;

  const { id } = await ctx.params;
  const orderId = id?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  let body: { text?: string | null } = {};
  try {
    body = (await req.json()) as { text?: string | null };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  try {
    const result = await applyOrderListAdminMemo(prisma, {
      orderId,
      tenantId: access.tenantId,
      userId: access.session.sub,
      text: body.text,
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
    }
    if (code === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 403 });
    }
    console.error("[list-admin-memo PATCH]", orderId, e);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}
