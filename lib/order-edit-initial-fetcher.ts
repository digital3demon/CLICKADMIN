import "server-only";
import type { OrderEditInitial } from "@/components/orders/OrderEditForm";
import type { SessionClaims } from "@/lib/auth/jwt";
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
import { invoiceParsedSnapshotForOrderEdit } from "@/lib/order-invoice-initial-for-edit";
import { resolveRegisteredByLabelForDisplay } from "@/lib/registered-by-label-display";
import { fetchWorkspaceActivePriceListName } from "@/lib/order-price-list-from-contractors";
import { getLabDueSettingsForTenant } from "@/lib/get-lab-due-hm-slots-for-tenant";
import { orderTestVisibilityWhere } from "@/lib/order-test-visibility";
import { activeContinuationChildrenWhere } from "@/lib/order-continuation-display";
import { fetchMergedOrderChatCorrections } from "@/lib/order-chat-corrections-read";
import { fetchMergedOrderProstheticsRequests } from "@/lib/order-prosthetics-requests-read";

export type FetchOrderEditInitialResult = {
  initial: OrderEditInitial;
  orderNumber: string;
  archivedAt: Date | null;
  clinicName: string | null;
  doctorName: string;
  demoKanbanCardTypes: Array<{ id: string; name: string }>;
  kanbanAbs: string | null;
};

export async function fetchOrderEditInitial(
  tenantId: string,
  orderId: string,
  session: SessionClaims | null,
): Promise<FetchOrderEditInitialResult | null> {
  const isDemoMode = Boolean(session?.demo);

  const [ordersPrisma, clientsPrisma, pricingPrisma] = await Promise.all([
    getOrdersPrisma(),
    getClientsPrisma(),
    getPricingPrisma(),
  ]);

  const order = await ordersPrisma.order.findFirst({
    where: {
      AND: [
        { id: orderId, tenantId },
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

  if (!order) return null;

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
          select: { name: true, depositBalanceRub: true },
        })
      : Promise.resolve(null),
    clientsPrisma.doctor.findUnique({
      where: { id: order.doctorId },
      select: { fullName: true, depositBalanceRub: true },
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
    depositAppliedRub: order.depositAppliedRub ?? null,
    depositAppliedParty: order.depositAppliedParty ?? null,
    depositBalanceRub: order.clinicId
      ? (clinic?.depositBalanceRub ?? 0)
      : (doctor?.depositBalanceRub ?? 0),
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
    chatCorrections: (
      await fetchMergedOrderChatCorrections(ordersPrisma, order.id, {
        tenantId,
      })
    ).map((c) => ({
      id: c.id,
      text: c.text,
      source: c.source,
      authorLabel: c.authorLabel,
      createdAt: c.createdAt.toISOString(),
      resolvedAt: c.resolvedAt?.toISOString() ?? null,
      rejectedAt: c.rejectedAt?.toISOString() ?? null,
    })),
    prostheticsRequests: (
      await fetchMergedOrderProstheticsRequests(ordersPrisma, order.id, {
        tenantId,
      })
    ).map((c) => ({
      id: c.id,
      text: c.text,
      source: c.source,
      authorLabel: c.authorLabel,
      createdAt: c.createdAt.toISOString(),
      resolvedAt: c.resolvedAt?.toISOString() ?? null,
      rejectedAt: c.rejectedAt?.toISOString() ?? null,
      arrivedAt: c.arrivedAt?.toISOString() ?? null,
    })),
  };

  return {
    initial,
    orderNumber: order.orderNumber,
    archivedAt: order.archivedAt,
    clinicName: clinic?.name ?? null,
    doctorName: doctor?.fullName ?? "—",
    demoKanbanCardTypes,
    kanbanAbs,
  };
}
