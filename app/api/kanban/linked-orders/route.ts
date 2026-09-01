import { NextResponse } from "next/server";
import {
  ConstructionCategory,
  type KaitenTrackLane,
  OrderStatus,
  Prisma,
  type OrderAttachmentScope,
} from "@prisma/client";
import { activeContinuationChildrenWhere } from "@/lib/order-continuation-display";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getClientsPrisma, getOrdersPrisma, getPricingPrisma } from "@/lib/get-domain-prisma";
import type { KaitenLinkedOrderForKanban } from "@/lib/kanban/kaiten-linked-order";
import { bestKaitenDescriptionMirrorForKanban } from "@/lib/kanban/kaiten-description-mirror";
import { getKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import { kaitenCommentsForSyncFromSnapshotPayload } from "@/lib/order-chat-correction-db";
import { ingestKaitenCommentsForOrder } from "@/lib/kanban/kaiten-comments-ingest-server";
import { getKaitenRestAuth } from "@/lib/kaiten-rest";
import { syncKaitenColumnTitlesForOrderIds } from "@/lib/kaiten-sync-order-column-titles";
import { isOrderWorkAttachment } from "@/lib/order-work-attachments";
import { importMissingKaitenFilesForOrder } from "@/lib/kaiten-files-import";
import { orderTestVisibilityWhere } from "@/lib/order-test-visibility";
import { ordersSearchWhere } from "@/lib/fetch-orders-list-page";
import { kanbanLinkedOrderNumberSuffixContains } from "@/lib/kanban/linked-orders-search-where";
import { kanbanLinkedOrderGoneIds } from "@/lib/kanban/linked-orders-gone-ids";
import {
  KANBAN_LANE_HYDRATE_TAKE,
  parseKanbanHydrateLanesParam,
} from "@/lib/kanban/linked-orders-hydrate";

/**
 * GET linked-orders:
 * — без q: recent 200 + ids на доске + ?lanes= (наряды дорожки из БД, без поиска);
 * — q≥2: текст/суффикс, hydrateWhere (в т.ч. «Kaiten позже»);
 * goneIds только по запрошенным ids (архив/отмена/нет в БД).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LINKED_ORDER_SELECT = {
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
  _count: {
    select: { sourceEmailLinks: true },
  },
  continuesFromOrder: {
    select: {
      id: true,
      orderNumber: true,
      kaitenCardId: true,
    },
  },
  continuationOrders: {
    where: activeContinuationChildrenWhere,
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      orderNumber: true,
      kaitenCardId: true,
    },
  },
  invoiceAttachmentId: true,
  attachments: {
    orderBy: { createdAt: "desc" as const },
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
    orderBy: { sortOrder: "asc" as const },
    take: 1,
    select: {
      priceListItemId: true,
    },
  },
} as const;

/** List-hydrate: без вложений, длинных текстов и зеркала описания — detail=1 в модалке. */
const LINKED_ORDER_SELECT_SLIM = {
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
  kaitenBlocked: true,
  kaitenBlockReason: true,
  kaitenBlockedAt: true,
  demoKanbanColumn: true,
  _count: {
    select: { sourceEmailLinks: true },
  },
  continuesFromOrder: {
    select: {
      id: true,
      orderNumber: true,
      kaitenCardId: true,
    },
  },
  continuationOrders: {
    where: activeContinuationChildrenWhere,
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      orderNumber: true,
      kaitenCardId: true,
    },
  },
  invoiceAttachmentId: true,
  constructions: {
    where: { category: ConstructionCategory.PRICE_LIST },
    orderBy: { sortOrder: "asc" as const },
    take: 1,
    select: {
      priceListItemId: true,
    },
  },
} as const;

function parseLinkedOrderIdsParam(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 250) break;
  }
  return out;
}

export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const boardOrderIds = parseLinkedOrderIdsParam(url.searchParams.get("ids"));
    const searchQ = url.searchParams.get("q")?.replace(/\s+/g, " ").trim() ?? "";
    const hydrateLanes = parseKanbanHydrateLanesParam(url.searchParams.get("lanes"));
    const detailHydrate = url.searchParams.get("detail") === "1";
    const rowSelect = detailHydrate ? LINKED_ORDER_SELECT : LINKED_ORDER_SELECT_SLIM;
    const [ordersPrisma, clientsPrisma, pricingPrisma] = await Promise.all([
      getOrdersPrisma(),
      getClientsPrisma(),
      getPricingPrisma(),
    ]);
    const visibilityAnd = orderTestVisibilityWhere({
      viewerRole: session.role,
      viewerUserId: session.sub,
    });
    /** Как ensure-linked-order-card: не archived/cancelled/test. Без этого поиск «299» не видит наряд, пока его не открыли в Заказах. */
    const hydrateWhere: Prisma.OrderWhereInput = {
      tenantId,
      archivedAt: null,
      status: { not: OrderStatus.CANCELLED },
      isTestOrder: false,
      AND: [visibilityAnd],
    };
    /** Пуллинг без q: не тащить «Kaiten позже» без зеркала. Карточки уже на доске — через hydrateWhere по ids. */
    const linkedOrdersWhere: Prisma.OrderWhereInput = {
      ...hydrateWhere,
      AND: [
        visibilityAnd,
        {
          OR: [
            { kaitenDecideLater: false },
            { createKanbanWithoutKaiten: true },
            { kaitenCardId: { not: null } },
          ],
        },
      ],
    };
    const searchActive = searchQ.length >= 2;
    const recentRows = searchActive
      ? []
      : await ordersPrisma.order.findMany({
          where: linkedOrdersWhere,
          orderBy: { createdAt: "desc" },
          take: 200,
          select: rowSelect,
        });
    const recentIds = new Set(recentRows.map((r) => r.id));
    const missingBoardIds = boardOrderIds.filter((id) => !recentIds.has(id));
    const boardExtraRows =
      missingBoardIds.length > 0
        ? await ordersPrisma.order.findMany({
            where: { ...hydrateWhere, id: { in: missingBoardIds } },
            select: rowSelect,
          })
        : [];
    /**
     * Доска без q: все живые наряды дорожки из БД (не 200 свежих и не tenant JSON).
     * Иначе карточка появляется только после поиска.
     */
    const laneRows =
      !searchActive && hydrateLanes.length > 0
        ? (
            await Promise.all(
              hydrateLanes.map((lane) =>
                ordersPrisma.order.findMany({
                  where: {
                    ...hydrateWhere,
                    kaitenTrackLane: lane as KaitenTrackLane,
                  },
                  orderBy: { createdAt: "desc" },
                  take: KANBAN_LANE_HYDRATE_TAKE,
                  select: rowSelect,
                }),
              ),
            )
          ).flat()
        : [];
    /* Поиск: не nested doctor/clinic (SaaS split DB); суффикс -NNN отдельно, чтобы take не вытеснил 2607-299. */
    let suffixRows: typeof recentRows = [];
    let searchExtraRows: typeof recentRows = [];
    if (searchQ.length >= 2) {
      try {
        const suffix = kanbanLinkedOrderNumberSuffixContains(searchQ);
        if (suffix) {
          suffixRows = await ordersPrisma.order.findMany({
            where: {
              ...hydrateWhere,
              orderNumber: { contains: suffix, mode: "insensitive" },
            },
            orderBy: { createdAt: "desc" },
            take: 80,
            select: rowSelect,
          });
        }
        const searchTextWhere = await ordersSearchWhere(searchQ, tenantId);
        searchExtraRows = await ordersPrisma.order.findMany({
          where: {
            ...hydrateWhere,
            AND: [visibilityAnd, searchTextWhere],
          },
          orderBy: { createdAt: "desc" },
          take: 120,
          select: rowSelect,
        });
      } catch (e) {
        console.error("[kanban/linked-orders] search extra", e);
      }
    }
    const seenRowIds = new Set<string>();
    const rows = [
      ...suffixRows,
      ...searchExtraRows,
      ...laneRows,
      ...boardExtraRows,
      ...recentRows,
    ].filter((r) => {
      if (seenRowIds.has(r.id)) return false;
      seenRowIds.add(r.id);
      return true;
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
      const fullRow = detailHydrate && "attachments" in o;
      const full = fullRow
        ? (o as (typeof rows)[number] & {
            attachments: Array<{
              id: string;
              fileName: string;
              mimeType: string | null;
              size: number;
              createdAt: Date;
              scope: OrderAttachmentScope;
            }>;
            clientOrderText: string | null;
            notes: string | null;
            kaitenCardDescriptionMirror: string | null;
          })
        : null;
      const attachments = full
        ? full.attachments
            .filter((a) => isOrderWorkAttachment(a, invId))
            .map((a) => ({
              id: a.id,
              fileName: a.fileName,
              mimeType: a.mimeType,
              size: a.size,
              createdAt: a.createdAt.toISOString(),
            }))
        : undefined;
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        patientName: o.patientName,
        doctorFullName: doctorById.get(o.doctorId)?.fullName?.trim() || "—",
        dueDate: o.dueDate ? o.dueDate.toISOString() : null,
        appointmentDate: o.appointmentDate ? o.appointmentDate.toISOString() : null,
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
        kaitenCardDescriptionMirror: full
          ? bestKaitenDescriptionMirrorForKanban(
              o.id,
              o.kaitenCardId ?? null,
              full.kaitenCardDescriptionMirror,
            )
          : null,
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
        clientOrderText: full ? (full.clientOrderText ?? null) : null,
        notes: full ? (full.notes ?? null) : null,
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
        attachments,
        sourceEmailCount: o._count.sourceEmailLinks,
      };
    });

    if (detailHydrate) {
    void (async () => {
      try {
        const auth = getKaitenRestAuth();
        if (!auth) return;
        const missingMirror = rows
          .filter((row) => {
            if (row.kaitenCardId == null || !("kaitenCardDescriptionMirror" in row)) {
              return false;
            }
            const mirror = row.kaitenCardDescriptionMirror;
            return typeof mirror !== "string" || !mirror.trim();
          })
          .map((o) => o.id)
          .slice(0, 5);
        if (missingMirror.length > 0) {
          await syncKaitenColumnTitlesForOrderIds(ordersPrisma, auth, missingMirror, {
            includeComments: false,
          });
        }
      } catch (e) {
        console.error("[kanban/linked-orders] description mirror sync", e);
      }
    })();

    void (async () => {
      try {
        const pullIds = rows
          .filter((o) => o.kaitenCardId != null)
          .map((o) => o.id)
          .slice(0, 3);
        for (const id of pullIds) {
          await importMissingKaitenFilesForOrder(id, { prisma: ordersPrisma, limit: 4 });
        }
      } catch (e) {
        console.error("[kanban/linked-orders] kaiten file import", e);
      }
    })();
    }

    void (async () => {
      try {
        const labTag = tenantTagRow?.kanbanAdminMentionTag;
        for (const o of rows) {
          if (o.kaitenCardId == null) continue;
          const snap = getKaitenSnapshotCache(o.id);
          if (snap == null) continue;
          const comm = kaitenCommentsForSyncFromSnapshotPayload(snap);
          await ingestKaitenCommentsForOrder({
            prisma: ordersPrisma,
            tenantId,
            orderId: o.id,
            parsed: comm,
            kanbanAdminMentionTag: labTag,
            skipCorrections: true,
            skipProsthetics: true,
            skipKanbanMirror: true,
          });
        }
      } catch (e) {
        console.error("[kanban/linked-orders] lab mention from snapshot", e);
      }
    })();

    const existenceRows =
      boardOrderIds.length > 0
        ? await ordersPrisma.order.findMany({
            where: { tenantId, id: { in: boardOrderIds } },
            select: { id: true, archivedAt: true, status: true },
          })
        : [];

    return NextResponse.json({
      orders,
      goneIds: kanbanLinkedOrderGoneIds({
        requestedIds: boardOrderIds,
        existing: existenceRows,
      }),
    });
  } catch (e) {
    console.error("[kanban/linked-orders]", e);
    return NextResponse.json({ error: "Не удалось загрузить наряды" }, { status: 500 });
  }
}
