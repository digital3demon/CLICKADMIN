/**
 * GET /api/finance-office/order-search?q= | ?id=
 * Краткий предпросмотр наряда для ручной привязки счёта/УПД.
 */
import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { fetchOrdersListPage } from "@/lib/fetch-orders-list-page";
import {
  compositionItemsFromClientOrderText,
  financeOfficeCompositionFromConstructions,
  financeOfficeOrderHitLabel,
  type FinanceOfficeOrderSearchHit,
} from "@/lib/finance-office-order-search";
import {
  getClientsPrisma,
  getOrdersPrisma,
  getPricingPrisma,
} from "@/lib/get-domain-prisma";
import { normalizeOrdersSearchQuery } from "@/lib/orders-list-query";

export const dynamic = "force-dynamic";

async function hitsForOrderIds(
  tenantId: string,
  ids: string[],
  meta: Array<{
    id: string;
    orderNumber: string;
    patientName: string | null;
    doctorName: string;
    clinicName: string | null;
  }>,
): Promise<FinanceOfficeOrderSearchHit[]> {
  if (ids.length === 0) return [];
  const [ordersPrisma, pricingPrisma] = await Promise.all([
    getOrdersPrisma(),
    getPricingPrisma(),
  ]);
  const rows = await ordersPrisma.order.findMany({
    where: { tenantId, archivedAt: null, id: { in: ids } },
    select: {
      id: true,
      clientOrderText: true,
      invoiceAttachmentId: true,
      invoiceIssued: true,
      invoiceNumber: true,
      updAttachmentId: true,
      constructions: {
        orderBy: { sortOrder: "asc" },
        select: {
          category: true,
          quantity: true,
          unitPrice: true,
          lineDiscountPercent: true,
          constructionTypeId: true,
          priceListItemId: true,
          materialId: true,
          shade: true,
          teethFdi: true,
          bridgeFromFdi: true,
          bridgeToFdi: true,
          arch: true,
        },
      },
    },
  });
  const typeIds = [
    ...new Set(
      rows.flatMap((r) =>
        r.constructions
          .map((c) => c.constructionTypeId)
          .filter((x): x is string => Boolean(x)),
      ),
    ),
  ];
  const materialIds = [
    ...new Set(
      rows.flatMap((r) =>
        r.constructions
          .map((c) => c.materialId)
          .filter((x): x is string => Boolean(x)),
      ),
    ),
  ];
  const priceIds = [
    ...new Set(
      rows.flatMap((r) =>
        r.constructions.map((c) => c.priceListItemId).filter((x): x is string => Boolean(x)),
      ),
    ),
  ];
  const [types, materials, priceItems] = await Promise.all([
    typeIds.length
      ? pricingPrisma.constructionType.findMany({
          where: { id: { in: typeIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    materialIds.length
      ? pricingPrisma.material.findMany({
          where: { id: { in: materialIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    priceIds.length
      ? pricingPrisma.priceListItem.findMany({
          where: { id: { in: priceIds } },
          select: { id: true, code: true, name: true },
        })
      : Promise.resolve([]),
  ]);
  const lookups = {
    typeById: new Map(types.map((t) => [t.id, t])),
    materialById: new Map(materials.map((m) => [m.id, m])),
    priceById: new Map(priceItems.map((p) => [p.id, p])),
  };
  const byId = new Map(rows.map((r) => [r.id, r]));
  return meta
    .map((m) => {
      const row = byId.get(m.id);
      if (!row) return null;
      const fromConstructions = financeOfficeCompositionFromConstructions(
        row.constructions,
        lookups,
      );
      const composition =
        fromConstructions.length > 0
          ? fromConstructions
          : compositionItemsFromClientOrderText(row.clientOrderText);
      const compositionLines = composition.map((c) => c.title).slice(0, 6);
      const alreadyHasInvoice = Boolean(
        row.invoiceAttachmentId ||
          row.invoiceIssued ||
          String(row.invoiceNumber || "").trim(),
      );
      const hit: FinanceOfficeOrderSearchHit = {
        id: m.id,
        orderNumber: m.orderNumber,
        patientName: m.patientName,
        doctorName: m.doctorName,
        clinicName: m.clinicName,
        label: financeOfficeOrderHitLabel(m),
        compositionLines,
        composition,
        alreadyHasInvoice,
        alreadyHasUpd: Boolean(row.updAttachmentId),
        invoiceAttachmentId: row.invoiceAttachmentId,
      };
      return hit;
    })
    .filter((x): x is FinanceOfficeOrderSearchHit => x != null);
}

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const id = String(url.searchParams.get("id") ?? "").trim();
  const q = normalizeOrdersSearchQuery(url.searchParams.get("q"));
  const prisma = await getOrdersPrisma();

  if (id) {
    const one = await prisma.order.findFirst({
      where: { tenantId, archivedAt: null, id },
      select: {
        id: true,
        orderNumber: true,
        patientName: true,
        doctorId: true,
        clinicId: true,
      },
    });
    if (!one) return NextResponse.json({ items: [] });
    const clients = await getClientsPrisma();
    const [doctor, clinic] = await Promise.all([
      clients.doctor.findUnique({
        where: { id: one.doctorId },
        select: { fullName: true },
      }),
      one.clinicId
        ? clients.clinic.findUnique({
            where: { id: one.clinicId },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);
    const items = await hitsForOrderIds(
      tenantId,
      [one.id],
      [
        {
          id: one.id,
          orderNumber: one.orderNumber,
          patientName: one.patientName,
          doctorName: doctor?.fullName ?? "—",
          clinicName: clinic?.name ?? null,
        },
      ],
    );
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const page = await fetchOrdersListPage(prisma, {
    tenantId,
    cursor: null,
    pageSize: 12,
    search: q,
    ordersListForUserId: session.sub,
    viewerRole: session.role,
    viewerUserId: session.sub,
  });
  const items = await hitsForOrderIds(
    tenantId,
    page.orders.map((o) => o.id),
    page.orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      patientName: o.patientName,
      doctorName: o.doctor.fullName,
      clinicName: o.clinic?.name ?? null,
    })),
  );
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
