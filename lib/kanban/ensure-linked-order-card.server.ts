import "server-only";

import { ConstructionCategory, OrderStatus } from "@prisma/client";
import {
  getClientsPrisma,
  getOrdersPrisma,
  getPricingPrisma,
} from "@/lib/get-domain-prisma";
import { linkedOrderKanbanPresence } from "@/lib/kanban/chat-sync";
import type { KaitenLinkedOrderForKanban } from "@/lib/kanban/kaiten-linked-order";
import { bestKaitenDescriptionMirrorForKanban } from "@/lib/kanban/kaiten-description-mirror";
import {
  loadKanbanTenantState,
  saveKanbanStateWithRetry,
} from "@/lib/kanban/kanban-tenant-state-write.server";
import {
  defaultAppState,
  mergeKaitenLinkedOrdersIntoAppState,
} from "@/lib/kanban/model";
import type { KanbanAppState } from "@/lib/kanban/types";
import { crmKanbanLinkedCardId } from "@/lib/kanban-order-card-url";
import { activeContinuationChildrenWhere } from "@/lib/order-continuation-display";
import { isOrderWorkAttachment } from "@/lib/order-work-attachments";

export { KANBAN_STATE_KEY as KANBAN_ENSURE_STATE_KEY } from "@/lib/kanban/kanban-tenant-state-write.server";

export type EnsureCrmKanbanLinkedCardResult = {
  ensured: boolean;
  hasCard: boolean;
  reason?: string;
  boardId?: string | null;
  cardId?: string | null;
  columnTitle?: string | null;
};

function isTenantClientStateMissing(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;
  const obj = err as { code?: string; message?: string; meta?: { table?: string } };
  return (
    obj.code === "P2021" &&
    (obj.meta?.table === "public.TenantClientState" ||
      obj.meta?.table === "TenantClientState" ||
      String(obj.message || "").includes("TenantClientState"))
  );
}

function presenceFromState(
  state: KanbanAppState,
  orderId: string,
): Pick<
  EnsureCrmKanbanLinkedCardResult,
  "hasCard" | "boardId" | "cardId" | "columnTitle"
> {
  const hit = linkedOrderKanbanPresence(state, orderId);
  if (!hit.hasCard) {
    return { hasCard: false, boardId: null, cardId: null, columnTitle: null };
  }
  return {
    hasCard: true,
    boardId: hit.boardId,
    cardId: hit.cardId || crmKanbanLinkedCardId(orderId),
    columnTitle: hit.columnTitle,
  };
}

async function buildLinkedOrderRow(
  orderId: string,
  tenantId: string,
): Promise<KaitenLinkedOrderForKanban | null> {
  const [ordersPrisma, clientsPrisma, pricingPrisma] = await Promise.all([
    getOrdersPrisma(),
    getClientsPrisma(),
    getPricingPrisma(),
  ]);
  const o = await ordersPrisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: {
      id: true,
      orderNumber: true,
      doctorId: true,
      patientName: true,
      dueDate: true,
      appointmentDate: true,
      dueToAdminsAt: true,
      kaitenAdminDueHasTime: true,
      kaitenCardTitleLabel: true,
      kaitenCardTypeId: true,
      kaitenTrackLane: true,
      isUrgent: true,
      urgentCoefficient: true,
      kaitenCardId: true,
      kaitenColumnTitle: true,
      kaitenCardSortOrder: true,
      kaitenCardTitleMirror: true,
      kaitenCardDescriptionMirror: true,
      kaitenBlocked: true,
      kaitenBlockReason: true,
      kaitenBlockedAt: true,
      demoKanbanColumn: true,
      clientOrderText: true,
      notes: true,
      invoiceAttachmentId: true,
      status: true,
      archivedAt: true,
      isTestOrder: true,
      _count: { select: { sourceEmailLinks: true } },
      continuesFromOrder: {
        select: { id: true, orderNumber: true, kaitenCardId: true },
      },
      continuationOrders: {
        where: activeContinuationChildrenWhere,
        orderBy: { createdAt: "desc" },
        select: { id: true, orderNumber: true, kaitenCardId: true },
      },
      attachments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          size: true,
          createdAt: true,
          scope: true,
        },
      },
      constructions: {
        where: { category: ConstructionCategory.PRICE_LIST },
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { priceListItemId: true },
      },
    },
  });
  if (!o) return null;
  if (o.archivedAt != null || o.status === OrderStatus.CANCELLED) {
    return null;
  }
  if (o.isTestOrder) return null;

  const priceListItemId = o.constructions[0]?.priceListItemId ?? null;
  const [doctor, cardType, priceItem] = await Promise.all([
    clientsPrisma.doctor.findFirst({
      where: { id: o.doctorId },
      select: { fullName: true },
    }),
    o.kaitenCardTypeId
      ? clientsPrisma.kaitenCardType.findFirst({
          where: { id: o.kaitenCardTypeId },
          select: { name: true },
        })
      : Promise.resolve(null),
    priceListItemId
      ? pricingPrisma.priceListItem.findFirst({
          where: { id: priceListItemId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);

  const invId = o.invoiceAttachmentId;
  const attRows = o.attachments.filter((a) => isOrderWorkAttachment(a, invId));

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    patientName: o.patientName,
    doctorFullName: doctor?.fullName?.trim() || "—",
    dueDate: o.dueDate ? o.dueDate.toISOString() : null,
    appointmentDate: o.appointmentDate ? o.appointmentDate.toISOString() : null,
    dueToAdminsAt: o.dueToAdminsAt ? o.dueToAdminsAt.toISOString() : null,
    kaitenAdminDueHasTime: o.kaitenAdminDueHasTime,
    kaitenCardTitleLabel: o.kaitenCardTitleLabel,
    kaitenCardTypeId: o.kaitenCardTypeId,
    kaitenCardTypeName: cardType?.name ?? null,
    kaitenTrackLane: o.kaitenTrackLane ?? null,
    isUrgent: o.isUrgent,
    urgentCoefficient: o.urgentCoefficient,
    kaitenCardId: o.kaitenCardId ?? null,
    kaitenColumnTitle: o.kaitenColumnTitle ?? null,
    kaitenCardSortOrder:
      o.kaitenCardSortOrder != null && Number.isFinite(o.kaitenCardSortOrder)
        ? o.kaitenCardSortOrder
        : null,
    kaitenCardTitleMirror: o.kaitenCardTitleMirror ?? null,
    kaitenCardDescriptionMirror: bestKaitenDescriptionMirrorForKanban(
      o.id,
      o.kaitenCardId ?? null,
      o.kaitenCardDescriptionMirror,
    ),
    kaitenBlocked: o.kaitenBlocked,
    kaitenBlockReason: o.kaitenBlockReason,
    kaitenBlockedAt: o.kaitenBlockedAt ? o.kaitenBlockedAt.toISOString() : null,
    demoKanbanColumn: o.demoKanbanColumn ?? null,
    primaryPriceListItemName: priceItem?.name?.trim() || null,
    clientOrderText: o.clientOrderText ?? null,
    notes: o.notes ?? null,
    continuesFromOrder: o.continuesFromOrder
      ? {
          id: o.continuesFromOrder.id,
          orderNumber: o.continuesFromOrder.orderNumber,
          kaitenCardId: o.continuesFromOrder.kaitenCardId ?? null,
        }
      : null,
    continuationFollowups: o.continuationOrders.map((child) => ({
      id: child.id,
      orderNumber: child.orderNumber,
      kaitenCardId: child.kaitenCardId ?? null,
    })),
    attachments: attRows.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType,
      size: a.size,
      createdAt: a.createdAt.toISOString(),
    })),
    sourceEmailCount: o._count.sourceEmailLinks,
  };
}

/**
 * Гарантирует linked-карточку наряда в CRM-канбане (tenant kanbanAppStateV3).
 * Канбан first: вызывается до синка с Kaiten.
 */
export async function ensureCrmKanbanLinkedCardForOrder(
  orderIdRaw: string,
  tenantIdRaw: string,
): Promise<EnsureCrmKanbanLinkedCardResult> {
  const orderId = String(orderIdRaw || "").trim();
  const tenantId = String(tenantIdRaw || "").trim();
  if (!orderId || !tenantId) {
    return { ensured: false, hasCard: false, reason: "missing_ids" };
  }

  try {
    const row = await buildLinkedOrderRow(orderId, tenantId);
    if (!row) {
      return {
        ensured: false,
        hasCard: false,
        reason: "order_not_eligible",
      };
    }

    const maxAttempts = 6;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const loaded = await loadKanbanTenantState(tenantId);
      const base = loaded.state ?? defaultAppState();
      const already = presenceFromState(base, orderId);
      const next = mergeKaitenLinkedOrdersIntoAppState(base, [row], {
        mode: "upsertOnly",
      });
      const saved = await saveKanbanStateWithRetry(
        tenantId,
        next,
        loaded.state ? loaded.updatedAt : null,
      );
      if (!saved) continue;
      const presence = presenceFromState(next, orderId);
      return {
        ensured: true,
        ...presence,
        reason: already.hasCard ? "already_present" : "created",
      };
    }
    return { ensured: false, hasCard: false, reason: "concurrent_write" };
  } catch (err) {
    if (isTenantClientStateMissing(err)) {
      return { ensured: false, hasCard: false, reason: "no_tenant_state_table" };
    }
    throw err;
  }
}
