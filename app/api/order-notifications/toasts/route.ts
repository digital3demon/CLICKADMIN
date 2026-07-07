import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getPrisma } from "@/lib/get-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { fetchOrderNotificationToasts } from "@/lib/order-notification-toasts.server";

export const dynamic = "force-dynamic";

/** Единый опрос уведомлений: общие (ORDERS_NOTIFICATIONS) + персональные @ник. */
export async function GET() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json(
      { messages: [], corrections: [], requests: [], personal: [], labMentionCount: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const tenantId = await orderTenantIdForSession(session);
  const ordersPrisma = await getOrdersPrisma();
  const corePrisma = await getPrisma();
  const userRow = await corePrisma.user.findUnique({
    where: { id: session.sub },
    select: { orderToastsPersonalOnly: true },
  });

  const payload = await fetchOrderNotificationToasts(ordersPrisma, {
    tenantId: tenantId ?? "",
    userId: session.sub,
    generalNotificationsAllowed: access?.ORDERS_NOTIFICATIONS === true,
    personalOnlyPref: userRow?.orderToastsPersonalOnly === true,
  });

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
