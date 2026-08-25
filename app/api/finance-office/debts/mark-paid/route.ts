import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { ORDER_PAYMENT_PAID } from "@/lib/order-clinic-client-fields";
import { recordOrderRevision } from "@/lib/record-order-revision";
import { FINANCE_OFFICE_DEBT_LIST_TAKE } from "@/lib/finance-office-debts";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (access?.FINANCE_OFFICE !== true) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет тенанта" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { orderIds?: unknown };
  const orderIds = Array.isArray(body.orderIds)
    ? body.orderIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];
  if (orderIds.length === 0) {
    return NextResponse.json({ error: "Выберите наряды." }, { status: 400 });
  }
  if (orderIds.length > FINANCE_OFFICE_DEBT_LIST_TAKE) {
    return NextResponse.json(
      { error: `Не больше ${FINANCE_OFFICE_DEBT_LIST_TAKE} нарядов за раз.` },
      { status: 400 },
    );
  }
  const prisma = await getPrisma();
  const found = await prisma.order.findMany({
    where: { tenantId, id: { in: orderIds }, archivedAt: null },
    select: { id: true },
  });
  const ids = found.map((o) => o.id);
  if (ids.length === 0) {
    return NextResponse.json({ error: "Наряды не найдены." }, { status: 404 });
  }
  await prisma.order.updateMany({
    where: { id: { in: ids } },
    data: { payment: ORDER_PAYMENT_PAID, paymentPartialRub: null },
  });
  await Promise.allSettled(
    ids.map((id) => recordOrderRevision(id, { kind: "SAVE" })),
  );
  return NextResponse.json({ ok: true, updated: ids.length });
}
