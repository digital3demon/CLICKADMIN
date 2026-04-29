import { NextResponse } from "next/server";
import { ConstructionCategory, OrderStatus } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getClientsPrisma, getOrdersPrisma, getPricingPrisma } from "@/lib/get-domain-prisma";
import type { KaitenLinkedOrderForKanban } from "@/lib/kanban/kaiten-linked-order";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  try {
    const [ordersPrisma, clientsPrisma, pricingPrisma] = await Promise.all([
      getOrdersPrisma(),
      getClientsPrisma(),
      getPricingPrisma(),
    ]);
    const rows = await ordersPrisma.order.findMany({
      where: {
        archivedAt: null,
        status: { not: OrderStatus.CANCELLED },
      },
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
        demoKanbanColumn: true,
        clientOrderText: true,
        notes: true,
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
        demoKanbanColumn: o.demoKanbanColumn ?? null,
        primaryPriceListItemName:
          o.constructions[0]?.priceListItemId
            ? (priceItemById.get(o.constructions[0].priceListItemId)?.name?.trim() || null)
            : null,
        clientOrderText: o.clientOrderText ?? null,
        notes: o.notes ?? null,
        attachments,
      };
    });

    return NextResponse.json({ orders });
  } catch (e) {
    console.error("[kanban/linked-orders]", e);
    return NextResponse.json({ error: "Не удалось загрузить наряды" }, { status: 500 });
  }
}
