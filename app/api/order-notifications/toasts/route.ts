import { NextResponse } from "next/server";
import { canAccessOrderChat, isKanbanOnlyUser } from "@/lib/auth/permissions";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import {
  fetchOrderNotificationToasts,
  maybeSyncKaitenForOrderNotificationToasts,
} from "@/lib/order-notification-toasts.server";

export const dynamic = "force-dynamic";

/**
 * Единый опрос уведомлений: лёгкий импорт чата Kaiten + чтение из БД.
 * Быстрее трёх отдельных /toasts и не ждёт только фонового cron.
 */
export async function GET() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session || isKanbanOnlyUser(session.role, access ?? undefined)) {
    return NextResponse.json(
      { messages: [], corrections: [], requests: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const tenantId = await orderTenantIdForSession(session);
  const prisma = await getOrdersPrisma();

  if (tenantId) {
    const sync = await maybeSyncKaitenForOrderNotificationToasts(prisma, tenantId);
    if (sync.rateLimited) {
      const includeChat = canAccessOrderChat(session.role, access ?? undefined);
      const payload = await fetchOrderNotificationToasts(prisma, {
        userId: session.sub,
        includeChat,
      });
      return NextResponse.json(
        { ...payload, rateLimited: true },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": "8",
          },
        },
      );
    }
  }

  const includeChat = canAccessOrderChat(session.role, access ?? undefined);
  const payload = await fetchOrderNotificationToasts(prisma, {
    userId: session.sub,
    includeChat,
  });

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
