import { NextResponse } from "next/server";
import { isKanbanOnlyUser } from "@/lib/auth/permissions";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { fetchOrderNotificationToasts } from "@/lib/order-notification-toasts.server";

export const dynamic = "force-dynamic";

/** Единый опрос уведомлений: только чтение из локальной БД (Канбан). */
export async function GET() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session || session.role === "USER" || isKanbanOnlyUser(session.role, access ?? undefined)) {
    return NextResponse.json(
      { messages: [], corrections: [], requests: [], labMentionCount: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const tenantId = await orderTenantIdForSession(session);
  const prisma = await getOrdersPrisma();

  const payload = await fetchOrderNotificationToasts(prisma, {
    tenantId: tenantId ?? "",
    userId: session.sub,
  });

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
