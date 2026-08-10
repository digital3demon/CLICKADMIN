import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { loadProstheticsToOrderForTenant } from "@/lib/prosthetics-in-transit.server";

export const dynamic = "force-dynamic";

/** Список протетики «Заказать» (ещё не принята). */
export async function GET() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (access?.ORDERS !== true) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const tenantId = await orderTenantIdForSession(session);
  const { count, items } = await loadProstheticsToOrderForTenant(tenantId ?? "");

  return NextResponse.json(
    { count, items },
    { headers: { "Cache-Control": "no-store" } },
  );
}
