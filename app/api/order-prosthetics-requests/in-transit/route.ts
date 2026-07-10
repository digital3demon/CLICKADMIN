import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { listProstheticsInTransit } from "@/lib/prosthetics-in-transit.server";

export const dynamic = "force-dynamic";

/** Список протетики «в пути» (принята, ещё не «пришла»). */
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
  const items = await listProstheticsInTransit(prisma, {
    tenantId: tenantId ?? "",
    take: 200,
  });

  return NextResponse.json(
    { count: items.length, items },
    { headers: { "Cache-Control": "no-store" } },
  );
}
