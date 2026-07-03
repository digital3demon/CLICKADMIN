import Link from "next/link";
import { notFound } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import {
  OrderEditForm,
  type OrderEditInitial,
  type OrderEditTab,
} from "@/components/orders/OrderEditForm";
import { OrderArchivedView } from "@/components/orders/OrderArchivedView";
import { getKaitenCardWebUrl } from "@/lib/kaiten-card-web-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { getSiteOrigin } from "@/lib/site-origin-server";
import { prostheticsFromDb } from "@/lib/order-prosthetics";
import {
  getClientsPrisma,
  getOrdersPrisma,
  getPricingPrisma,
} from "@/lib/get-domain-prisma";
import { normalizeLegacyLabWorkStatus } from "@/lib/lab-work-status";
import { canAcceptOrderChatCorrections, canEditOrders } from "@/lib/auth/permissions";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { invoiceParsedSnapshotForOrderEdit } from "@/lib/order-invoice-initial-for-edit";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { resolveRegisteredByLabelForDisplay } from "@/lib/registered-by-label-display";
import { fetchWorkspaceActivePriceListName } from "@/lib/order-price-list-from-contractors";
import { getLabDueSettingsForTenant } from "@/lib/get-lab-due-hm-slots-for-tenant";
import { getPrisma } from "@/lib/get-prisma";
import { loadKaitenIntegrationTenantState } from "@/lib/kaiten-integration/settings";
import { orderTestVisibilityWhere } from "@/lib/order-test-visibility";
import { decodeOrderPublicRef } from "@/lib/order-public-ref";
import { activeContinuationChildrenWhere } from "@/lib/order-continuation-display";

export const dynamic = "force-dynamic";

type PageProps = {
  params?: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstQuery(
  v: string | string[] | undefined,
): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function OrderEditPage({
  params,
  searchParams,
}: PageProps) {
  const resolved = params != null ? await params : null;
  const rawParam = resolved?.id?.trim() ?? "";
  if (!rawParam) notFound();
  const resolvedOrderId = decodeOrderPublicRef(rawParam) ?? rawParam;

  const sp = searchParams != null ? await searchParams : {};
  const tabQ = firstQuery(sp.tab);
  const initialActiveTab: OrderEditTab | undefined =
    tabQ === "history"
      ? "История"
      : tabQ === "documents" || tabQ === "docs" || tabQ === "edo"
        ? "Документооборот"
        : tabQ === "kaiten" || tabQ === "kanban"
          ? "Канбан/Кайтен"
          : undefined;

  const { session, access } = await getSessionWithModuleAccess();
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) notFound();
  const isDemoMode = Boolean(session?.demo);

  const [ordersPrisma, clientsPrisma, pricingPrisma] = await Promise.all([
    getOrdersPrisma(),
    getClientsPrisma(),
    getPricingPrisma(),
  ]);
  let order;
  try {
    order = await ordersPrisma.order.findFirst({
      where: {
        AND: [
          { id: resolvedOrderId, tenantId },
          orderTestVisibilityWhere({
            viewerRole: session?.role ?? null,
            viewerUserId: session?.sub ?? null,
          }),
        ],
      },
      include: {
        constructions: {
          orderBy: { sortOrder: "asc" },
        },
        invoiceAttachment: { select: { createdAt: true } },
        chatCorrections: {
          orderBy: [{ resolvedAt: "asc" }, { createdAt: "asc" }],
        },
        prostheticsRequests: {
          orderBy: [{ resolvedAt: "asc" }, { createdAt: "asc" }],
        },
      },
    });
  } catch (e) {
    console.error("[order edit] prisma", e);
    return (
      <ModuleFrame title="Наряд" description="">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <p className="font-medium">Ошибка базы данных</p>
          <p className="mt-2">
            Выполните{" "}
            <code className="rounded bg-amber-100 px-1">npx prisma db push</code>
          </p>
          <Link
            href="/orders"
            className="mt-4 inline-block text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
          >
            ← К заказам
          </Link>
        </div>
      </ModuleFrame>
    );
  }

  if (!order) notFound();
  const [
    clinic,
    doctor,
    courier,
    courierPickup,
    courierDelivery,
    kaitenCardType,
    continuesFromOrder,
    continuationFollowups,
  ] = await Promise.all([
    order.clinicId
      ? clientsPrisma.clinic.findUnique({
          where: { id: order.clinicId },
          select: { name: true },
        })
      : Promise.resolve(null),
    clientsPrisma.doctor.findUnique({
      where: { id: order.doctorId },
      select: { fullName: true },
    }),
    order.courierId
      ? clientsPrisma.courier.findUnique({
          where: { id: order.courierId },
          select: { id: true, name: true, isActive: true },
        })
      : Promise.resolve(null),
    order.courierPickupId
      ? clientsPrisma.courier.findUnique({
          where: { id: order.courierPickupId },
          select: { id: true, name: true, isActive: true },
        })
      : Promise.resolve(null),
    order.courierDeliveryId
      ? clientsPrisma.courier.findUnique({
          where: { id: order.courierDeliveryId },
          select: { id: true, name: true, isActive: true },
        })
      : Promise.resolve(null),
    order.kaitenCardTypeId
      ? clientsPrisma.kaitenCardType.findUnique({
          where: { id: order.kaitenCardTypeId },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    order.continuesFromOrderId
      ? ordersPrisma.order.findUnique({
          where: { id: order.continuesFromOrderId },
          select: { id: true, orderNumber: true },
        })
      : Promise.resolve(null),
    ordersPrisma.order.findMany({
      where: {
        continuesFromOrderId: order.id,
        ...activeContinuationChildrenWhere,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNumber: true },
    }),
  ]);
  const priceListItemIds = Array.from(
    new Set(order.constructions.map((c) => c.priceListItemId).filter(Boolean)),
  ) as string[];
  const priceItems = priceListItemIds.length
    ? await pricingPrisma.priceListItem.findMany({
        where: { id: { in: priceListItemIds } },
        select: {
          id: true,
          code: true,
          name: true,
          priceRub: true,
          leadWorkingDays: true,
          variablePrice: true,
        },
      })
    : [];
  const priceItemById = new Map(priceItems.map((x) => [x.id, x]));

  if (order.archivedAt) {
    return (
      <OrderArchivedView
        orderId={order.id}
        orderNumber={order.orderNumber}
        patientName={order.patientName}
        clinicName={clinic?.name ?? null}
        doctorName={doctor?.fullName ?? "—"}
        archivedAtIso={order.archivedAt.toISOString()}
      />
    );
  }

  const demoKanbanCardTypes = isDemoMode
    ? await clientsPrisma.kaitenCardType.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const siteOrigin = await getSiteOrigin();
  const kanbanAbs = siteOrigin
    ? `${siteOrigin.replace(/\/$/, "")}${kanbanOrderDeepLinkPath(order.id)}`
    : null;

  const invParsed = invoiceParsedSnapshotForOrderEdit(order);

  const registeredByLabelResolved = await resolveRegisteredByLabelForDisplay(
    tenantId,
    order.registeredByLabel,
  );

  const workspaceActivePriceListName =
    await fetchWorkspaceActivePriceListName(pricingPrisma);

  const { slots: labDueHmSlots, country: productionCalendarCountry } =
    await getLabDueSettingsForTenant(tenantId);

  const initial: OrderEditInitial = {
    id: order.id,
    orderNumber: order.orderNumber,
    clinicId: order.clinicId,
    doctorId: order.doctorId,
    patientName: order.patientName,
    notes: order.notes,
    clientOrderText: order.clientOrderText,
    labWorkStatus: normalizeLegacyLabWorkStatus(String(order.labWorkStatus)),
    isUrgent: order.isUrgent,
    urgentCoefficient: order.urgentCoefficient,
    dueDate: order.dueDate?.toISOString() ?? null,
    dueToAdminsAt: order.dueToAdminsAt?.toISOString() ?? null,
    kaitenAdminDueHasTime: order.kaitenAdminDueHasTime,
    dueToAdminsHasTime: order.dueToAdminsHasTime,
    workReceivedAt: order.workReceivedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    labDueHmSlots,
    productionCalendarCountry,
    invoiceIssued: order.invoiceIssued,
    invoiceNumber: order.invoiceNumber,
    invoicePaperDocs: order.invoicePaperDocs,
    invoiceSentToEdo: order.invoiceSentToEdo,
    invoiceEdoSigned: order.invoiceEdoSigned,
    invoicePrinted: order.invoicePrinted,
    narjadPrinted: order.narjadPrinted,
    adminShippedOtpr: order.adminShippedOtpr,
    shippedDescription: order.shippedDescription,
    invoiceParsedLines: invParsed.invoiceParsedLines,
    invoiceParsedTotalRub: invParsed.invoiceParsedTotalRub,
    invoiceParsedSummaryText: invParsed.invoiceParsedSummaryText,
    invoicePaymentNotes: order.invoicePaymentNotes,
    orderPriceListKind: order.orderPriceListKind,
    workspaceActivePriceListName,
    orderPriceListNote: order.orderPriceListNote,
    prostheticsOrdered: order.prostheticsOrdered,
    correctionTrack: order.correctionTrack ?? null,
    correctionReason: order.correctionReason ?? null,
    correctionPaid: order.correctionPaid,
    registeredByLabel: registeredByLabelResolved,
    courierId: order.courierId,
    courierName: courier?.name ?? null,
    courierPickupId: order.courierPickupId,
    courierPickupName: courierPickup?.name ?? null,
    courierDeliveryId: order.courierDeliveryId,
    courierDeliveryName: courierDelivery?.name ?? null,
    legalEntity: order.legalEntity,
    payment: order.payment,
    paymentPartialRub: order.paymentPartialRub,
    excludeFromReconciliation: order.excludeFromReconciliation,
    excludeFromReconciliationUntil:
      order.excludeFromReconciliationUntil?.toISOString() ?? null,
    hasScans: order.hasScans,
    hasCt: order.hasCt,
    hasMri: order.hasMri,
    hasPhoto: order.hasPhoto,
    additionalSourceNotes: order.additionalSourceNotes,
    compositionDiscountPercent: order.compositionDiscountPercent ?? 0,
    financeCalculated: order.financeCalculated === true,
    constructions: order.constructions.map((c) => ({
      category: c.category,
      constructionTypeId: c.constructionTypeId,
      priceListItemId: c.priceListItemId,
      priceListItem: c.priceListItemId ? (priceItemById.get(c.priceListItemId) ?? null) : null,
      materialId: c.materialId,
      shade: c.shade,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      lineDiscountPercent: c.lineDiscountPercent ?? 0,
      teethFdi: c.teethFdi,
      bridgeFromFdi: c.bridgeFromFdi,
      bridgeToFdi: c.bridgeToFdi,
      arch: c.arch,
    })),
    prosthetics: prostheticsFromDb(order.prosthetics),
    kaitenCardId: order.kaitenCardId,
    kaitenCardTitleLabel: order.kaitenCardTitleLabel,
    kaitenDecideLater: order.kaitenDecideLater,
    kaitenSyncError: order.kaitenSyncError,
    kaitenCardTypeId: order.kaitenCardTypeId,
    kaitenCardTypeName: kaitenCardType?.name ?? null,
    demoKanbanColumn: order.demoKanbanColumn,
    kaitenColumnTitle: order.kaitenColumnTitle,
    kaitenCardUrl:
      isDemoMode && kanbanAbs
        ? kanbanAbs
        : order.kaitenCardId != null
          ? getKaitenCardWebUrl(order.kaitenCardId)
          : null,
    kaitenTrackLane: order.kaitenTrackLane,
    kaitenBlocked: order.kaitenBlocked,
    kaitenBlockReason: order.kaitenBlockReason,
    invoiceAttachmentId:
      order.invoiceAttachment != null ? order.invoiceAttachmentId : null,
    invoiceAttachmentCreatedAt:
      order.invoiceAttachment?.createdAt?.toISOString() ?? null,
    continuesFromOrder: continuesFromOrder
      ? {
          id: continuesFromOrder.id,
          orderNumber: continuesFromOrder.orderNumber,
        }
      : null,
    continuationFollowups: continuationFollowups.map((child) => ({
      id: child.id,
      orderNumber: child.orderNumber,
    })),
    chatCorrections: order.chatCorrections.map((c) => ({
      id: c.id,
      text: c.text,
      source: c.source,
      authorLabel: c.authorLabel,
      createdAt: c.createdAt.toISOString(),
      resolvedAt: c.resolvedAt?.toISOString() ?? null,
      rejectedAt: c.rejectedAt?.toISOString() ?? null,
    })),
    prostheticsRequests: order.prostheticsRequests.map((c) => ({
      id: c.id,
      text: c.text,
      source: c.source,
      authorLabel: c.authorLabel,
      createdAt: c.createdAt.toISOString(),
      resolvedAt: c.resolvedAt?.toISOString() ?? null,
      rejectedAt: c.rejectedAt?.toISOString() ?? null,
    })),
  };

  const canAcceptChatCorrections =
    session != null && canAcceptOrderChatCorrections(session.role);
  const canEditClients =
    session?.role === "OWNER" || access?.CLIENTS_EDIT === true;
  const canEditOrder =
    session != null && canEditOrders(session.role, access ?? undefined);

  let kaitenIntegrationActive = true;
  try {
    const prisma = await getPrisma();
    const integration = await loadKaitenIntegrationTenantState(
      prisma,
      tenantId,
    );
    kaitenIntegrationActive = integration.active;
  } catch {
    kaitenIntegrationActive = true;
  }

  return (
    <OrderEditForm
      initial={initial}
      initialActiveTab={initialActiveTab}
      isDemoMode={isDemoMode}
      kaitenIntegrationActive={kaitenIntegrationActive}
      kanbanCardUrl={kanbanAbs}
      demoKanbanCardTypes={demoKanbanCardTypes}
      canAcceptChatCorrections={canAcceptChatCorrections}
      canEditClients={canEditClients}
      canEditOrder={canEditOrder}
      viewerRole={session?.role ?? null}
      orderPageFrame={{
        title: `Наряд ${order.orderNumber}`,
      }}
    />
  );
}
