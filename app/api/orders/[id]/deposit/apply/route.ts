import { NextResponse } from "next/server";
import { canEditOrders } from "@/lib/auth/permissions";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { applyDepositToOrder } from "@/lib/deposit-ledger";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";

export const dynamic = "force-dynamic";

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
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const moduleAccess = await getEffectiveModuleAccess(tenantId, session.role);
  if (!canEditOrders(session.role, moduleAccess)) {
    return NextResponse.json(
      { error: "Нет права «Редактирование заказа»" },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;
  const orderId = id?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  try {
    const result = await prisma.$transaction((tx) =>
      applyDepositToOrder(tx, {
        tenantId,
        orderId,
        createdByUserId: session.sub,
      }),
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка учёта депозита";
    const status = msg.includes("не найден") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
