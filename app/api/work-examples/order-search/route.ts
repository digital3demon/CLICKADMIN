import { NextResponse } from "next/server";
import { fetchOrdersListPage } from "@/lib/fetch-orders-list-page";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { normalizeOrdersSearchQuery } from "@/lib/orders-list-query";
import { requireWorkExamplesCtx } from "@/lib/work-examples/access.server";

export const dynamic = "force-dynamic";

/**
 * GET ?q= — тот же поиск, что список заказов / «добавить в наряд»:
 * номер YYMM-NNN, пациент, врач, клиника. Не \\b (кириллица).
 */
export async function GET(req: Request) {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const q = normalizeOrdersSearchQuery(new URL(req.url).searchParams.get("q"));
  if (q.length < 2) return NextResponse.json({ items: [] });

  const prisma = await getOrdersPrisma();
  const page = await fetchOrdersListPage(prisma, {
    tenantId: ctx.tenantId,
    cursor: null,
    pageSize: 20,
    search: q,
    ordersListForUserId: ctx.session.sub,
    viewerRole: ctx.session.role,
    viewerUserId: ctx.session.sub,
  });

  return NextResponse.json(
    {
      items: page.orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        patientName: o.patientName,
        doctorName: o.doctor.fullName,
        clinicName: o.clinic?.name ?? "",
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
