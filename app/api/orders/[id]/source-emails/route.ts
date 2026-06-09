import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { fetchOrderSourceEmails } from "@/lib/mail/order-source-emails";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Тенант не найден" }, { status: 403 });
  }
  const { id: orderId } = await params;
  const prisma = await getOrdersPrisma();
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }
  const emails = await fetchOrderSourceEmails(prisma, tenantId, orderId);
  return NextResponse.json({ emails });
}
