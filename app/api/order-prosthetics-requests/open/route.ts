import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import {
  listProstheticsInTransit,
  listProstheticsToOrder,
} from "@/lib/prosthetics-in-transit.server";

export const dynamic = "force-dynamic";

const MODAL_TAKE = 80;

/**
 * Один ответ для модалки «Заказы протетики»: Заказать + В пути (slim, без inventory).
 */
export async function GET() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (access?.ORDERS !== true) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const tenantId = await orderTenantIdForSession(session);
  const prisma = await getOrdersPrisma();
  const [toOrder, inTransit] = await Promise.all([
    listProstheticsToOrder(prisma, {
      tenantId: tenantId ?? "",
      take: MODAL_TAKE,
      slim: true,
    }),
    listProstheticsInTransit(prisma, {
      tenantId: tenantId ?? "",
      take: MODAL_TAKE,
      slim: true,
    }),
  ]);

  return NextResponse.json(
    {
      toOrderCount: toOrder.length,
      inTransitCount: inTransit.length,
      toOrder,
      inTransit,
    },
    { headers: { "Cache-Control": "private, max-age=5" } },
  );
}
