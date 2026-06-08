import { NextResponse } from "next/server";
import { ConstructionCategory, OrderStatus, Prisma } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getClientsPrisma, getOrdersPrisma, getPricingPrisma } from "@/lib/get-domain-prisma";
import type { KaitenLinkedOrderForKanban } from "@/lib/kanban/kaiten-linked-order";
import { getKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import { kaitenCommentsForSyncFromSnapshotPayload } from "@/lib/order-chat-correction-db";
import { syncKaitenLabMentionFromParsedComments } from "@/lib/order-kaiten-lab-mention-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }

  try {
    const [ordersPrisma, clientsPrisma, pricingPrisma] = await Promise.all([
      getOrdersPrisma(),
      getClientsPrisma(),
      getPricingPrisma(),
    ]);
    /** Не показывать на канбане «Kaiten позже» без явного зеркала CRM — иначе ложная карточка. */
    const linkedOrdersWhere: Prisma.OrderWhereInput = {
      tenantId,
      archivedAt: null,
      status: { not: OrderStatus.CANCELLED },
      OR: [
        { kaitenDecideLater: false },
        { createKanbanWithoutKaiten: true },
        { kaitenCardId: { not: null } },
      ],
    };
    const rows = await ordersPrisma.order.findMany({
      where: linkedOrdersWhere,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        orderNumber: true,
        doctorId: true,
        patientName: true,
        dueDate: true,
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
        continuesFromOrder: {
          select: {
            id: true,
            orderNumber: true,
            kaitenCardId: true,
          },
        },
        invoiceAttachmentId: true,
        attachments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            size: true,
            createdAt: true,
          },
        },
        constructions: {
          where: { category: ConstructionCategory.PRICE_LIST },
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: {
            priceListItemId: true,
          },
        },
      },
    });
    const doctorIds = Array.from(new Set(rows.map((x) => x.doctorId)));
    const cardTypeIds = Array.from(
      new Set(rows.map((x) => x.kaitenCardTypeId).filter(Boolean)),
    ) as string[];
    const priceListItemIds = Array.from(
      new Set(
        rows
          .map((x) => x.constructions[0]?.priceListItemId)
          .filter(Boolean),
      ),
    ) as string[];
    const [doctors, cardTypes, priceItems] = await Promise.all([
      clientsPrisma.doctor.findMany({
        where: { id: { in: doctorIds } },
        select: { id: true, fullName: true },
      }),
      cardTypeIds.length
        ? clientsPrisma.kaitenCardType.findMany({
            where: { id: { in: cardTypeIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      priceListItemIds.length
        ? pricingPrisma.priceListItem.findMany({
            where: { id: { in: priceListItemIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);
    const doctorById = new Map(doctors.map((x) => [x.id, x]));
    const cardTypeById = new Map(cardTypes.map((x) => [x.id, x]));
    const priceItemById = new Map(priceItems.map((x) => [x.id, x]));

    const tenantTagRow = await ordersPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { kanbanAdminMentionTag: true },
    });

    const orders: KaitenLinkedOrderForKanban[] = rows.map((o) => {
      const invId = o.invoiceAttachmentId;
      const attRows = invId
        ? o.attachments.filter((a) => a.id !== invId)
        : o.attachments;
      const attachments = attRows.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        mimeType: a.mimeType,
        size: a.size,
        createdAt: a.createdAt.toISOString(),
      }));
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        patientName: o.patientName,
        doctorFullName: doctorById.get(o.doctorId)?.fullName?.trim() || "—",
        dueDate: o.dueDate ? o.dueDate.toISOString() : null,
        dueToAdminsAt: o.dueToAdminsAt ? o.dueToAdminsAt.toISOString() : null,
        kaitenAdminDueHasTime: o.kaitenAdminDueHasTime,
        kaitenCardTitleLabel: o.kaitenCardTitleLabel,
        kaitenCardTypeId: o.kaitenCardTypeId,
        kaitenCardTypeName: o.kaitenCardTypeId
          ? (cardTypeById.get(o.kaitenCardTypeId)?.name ?? null)
          : null,
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
        kaitenCardDescriptionMirror: o.kaitenCardDescriptionMirror ?? null,
        kaitenBlocked: o.kaitenBlocked,
        kaitenBlockReason: o.kaitenBlockReason,
        kaitenBlockedAt: o.kaitenBlockedAt
          ? o.kaitenBlockedAt.toISOString()
          : null,
        demoKanbanColumn: o.demoKanbanColumn ?? null,
        primaryPriceListItemName:
          o.constructions[0]?.priceListItemId
            ? (priceItemById.get(o.constructions[0].priceListItemId)?.name?.trim() || null)
            : null,
        clientOrderText: o.clientOrderText ?? null,
        notes: o.notes ?? null,
        continuesFromOrder: o.continuesFromOrder
          ? {
              id: o.continuesFromOrder.id,
              orderNumber: o.continuesFromOrder.orderNumber,
              kaitenCardId: o.continuesFromOrder.kaitenCardId ?? null,
            }
          : null,
        attachments,
      };
    });

    void (async () => {
      try {
        const labTag = tenantTagRow?.kanbanAdminMentionTag;
        for (const o of rows) {
          if (o.kaitenCardId == null) continue;
          const snap = getKaitenSnapshotCache(o.id);
          if (snap == null) continue;
          const comm = kaitenCommentsForSyncFromSnapshotPayload(snap);
          await syncKaitenLabMentionFromParsedComments(
            ordersPrisma,
            o.id,
            comm,
            labTag,
          );
        }
      } catch (e) {
        console.error("[kanban/linked-orders] lab mention from snapshot", e);
      }
    })();

    return NextResponse.json({ orders });
  } catch (e) {
    console.error("[kanban/linked-orders]", e);
    return NextResponse.json({ error: "Не удалось загрузить наряды" }, { status: 500 });
  }
}
