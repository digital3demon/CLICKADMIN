import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { getRecentOrdersPaidAfterUnpaidOrPartial } from "@/lib/recent-orders-paid-from-revisions";

export const dynamic = "force-dynamic";

/** Блок «Оплаты» в сайдбаре: недавние наряды, где оплата сменилась на «Оплачено». */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.sub || session.demo) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let tenantId: string;
  try {
    tenantId = await requireSessionTenantId(session);
  } catch {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const items = await getRecentOrdersPaidAfterUnpaidOrPartial(prisma, tenantId);

  return NextResponse.json({ items }, { headers: { "Cache-Control": "private, no-store" } });
}
