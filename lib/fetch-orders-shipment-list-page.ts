import "server-only";
import type { Prisma } from "@prisma/client";
import type { PrismaClient, UserRole } from "@prisma/client";
import {
  listTagWhere,
  orderAttentionListSupersetWhere,
  parseListTagParam,
} from "@/lib/order-list-tag-filter";
import { orderTestVisibilityWhere } from "@/lib/order-test-visibility";
import {
  ordersListPageSelect,
  ordersSearchWhere,
  toOrderListPageRow,
  type OrderListPageRow,
} from "@/lib/fetch-orders-list-page";
import { hydrateOrderKaitenLabMentionHighlight } from "@/lib/hydrate-order-kaiten-lab-mention-highlight";
import { hydrateListPendingChatCorrectionsFromInbox } from "@/lib/order-chat-corrections-read";
import { hydrateListPendingProstheticsFromInbox } from "@/lib/order-prosthetics-requests-read";
import { getClientsPrisma } from "@/lib/get-domain-prisma";
import type { OrdersShipmentMode } from "@/lib/orders-shipment-list-query";
import {
  compareOrdersByEffectiveAppointment,
  ordersShipmentListWhere,
} from "@/lib/orders-shipment-list-filter";
import {
  decodeOrdersShipmentCursor,
  encodeOrdersShipmentCursor,
} from "@/lib/orders-shipment-list-cursor";

const MAX_SHIPMENT_SCAN = 5000;

async function hydrateContractors(
  rows: OrderListPageRow[],
): Promise<OrderListPageRow[]> {
  if (rows.length === 0) return rows;
  const doctorIds = Array.from(
    new Set(rows.map((r) => r.doctor?.id).filter(Boolean)),
  ) as string[];
  const clinicIds = Array.from(
    new Set(rows.map((r) => r.clinic?.id).filter(Boolean)),
  ) as string[];
  const clientsPrisma = await getClientsPrisma();
  const [doctors, clinics] = await Promise.all([
    doctorIds.length
      ? clientsPrisma.doctor.findMany({
          where: { id: { in: doctorIds } },
          select: { id: true, fullName: true },
        })
      : Promise.resolve([]),
    clinicIds.length
      ? clientsPrisma.clinic.findMany({
          where: { id: { in: clinicIds } },
          select: { id: true, name: true, address: true },
        })
      : Promise.resolve([]),
  ]);
  const doctorById = new Map(doctors.map((x) => [x.id, x]));
  const clinicById = new Map(clinics.map((x) => [x.id, x]));
  return rows.map((row) => {
    const d = row.doctor ? doctorById.get(row.doctor.id) : null;
    const c = row.clinic ? clinicById.get(row.clinic.id) : null;
    return {
      ...row,
      doctor: { id: row.doctor.id, fullName: d?.fullName ?? "—" },
      clinic: row.clinic
        ? {
            id: row.clinic.id,
            name: c?.name ?? "—",
            address: c?.address ?? null,
          }
        : null,
    };
  });
}

async function hydrateShipmentListRows(
  db: PrismaClient,
  userId: string | null | undefined,
  rows: OrderListPageRow[],
): Promise<OrderListPageRow[]> {
  return hydrateListPendingProstheticsFromInbox(
    db,
    await hydrateListPendingChatCorrectionsFromInbox(
      db,
      await hydrateOrderKaitenLabMentionHighlight(db, userId ?? null, rows),
    ),
  );
}

export async function fetchOrdersShipmentListPage(
  db: PrismaClient,
  opts: {
    tenantId: string;
    cursor: string | null | undefined;
    /** 1-based. Если задан — offset, курсор игнорируется. */
    page?: number | null;
    pageSize: number;
    shipmentMode: OrdersShipmentMode;
    shipFrom: string | null;
    shipTo: string | null;
    tag?: string | null | undefined;
    search?: string | null | undefined;
    ordersListForUserId?: string | null;
    viewerRole?: UserRole | null;
    viewerUserId?: string | null;
  },
): Promise<{
  orders: OrderListPageRow[];
  nextCursor: string | null;
  totalCount: number | null;
  page: number;
  hasMore: boolean;
  truncated: boolean;
}> {
  const dec = decodeOrdersShipmentCursor(opts.cursor ?? undefined);
  const tagDecoded =
    opts.tag != null && String(opts.tag).trim()
      ? String(opts.tag).trim()
      : null;
  const parsedTag = parseListTagParam(tagDecoded);

  const parts: Prisma.OrderWhereInput[] = [
    { tenantId: opts.tenantId },
    { archivedAt: null },
    orderTestVisibilityWhere({
      viewerRole: opts.viewerRole ?? null,
      viewerUserId: opts.viewerUserId ?? opts.ordersListForUserId ?? null,
    }),
    ordersShipmentListWhere({
      mode: opts.shipmentMode,
      shipFrom: opts.shipFrom,
      shipTo: opts.shipTo,
    }),
  ];

  if (parsedTag) {
    if (parsedTag.kind === "orderAttention") {
      parts.push(orderAttentionListSupersetWhere());
    } else {
      parts.push(listTagWhere(parsedTag));
    }
  }

  const searchTrim =
    opts.search != null && String(opts.search).trim()
      ? String(opts.search).trim()
      : "";
  if (searchTrim) {
    parts.push(await ordersSearchWhere(searchTrim, opts.tenantId));
  }

  const where: Prisma.OrderWhereInput =
    parts.length === 1 ? parts[0]! : { AND: parts };

  const rawRows = await db.order.findMany({
    where,
    select: ordersListPageSelect,
    take: MAX_SHIPMENT_SCAN,
    orderBy: [{ orderNumber: "asc" }],
  });

  const truncated = rawRows.length >= MAX_SHIPMENT_SCAN;
  const sorted = [...rawRows].sort(compareOrdersByEffectiveAppointment);
  let mapped = sorted.map((o) => toOrderListPageRow(o));
  if (parsedTag?.kind === "orderAttention") {
    mapped = mapped.filter(
      (o) => o.listPendingChatCorrections || o.listCompositionMismatch,
    );
  }

  const totalCount = mapped.length;
  const useOffset = opts.page != null || !dec;
  let page = useOffset ? Math.max(1, Math.floor(opts.page ?? 1)) : 1;
  let startIdx = 0;
  if (useOffset) {
    startIdx = (page - 1) * opts.pageSize;
    if (totalCount > 0 && startIdx >= totalCount) {
      page = Math.max(1, Math.ceil(totalCount / opts.pageSize));
      startIdx = (page - 1) * opts.pageSize;
    }
  } else if (dec) {
    const found = mapped.findIndex((r) => r.id === dec.i);
    startIdx = found >= 0 ? found + 1 : 0;
  }

  const pageRaw = mapped.slice(startIdx, startIdx + opts.pageSize);
  const hasMore = startIdx + pageRaw.length < totalCount;
  const last = pageRaw[pageRaw.length - 1];

  let orders = await hydrateContractors(pageRaw);
  orders = await hydrateShipmentListRows(db, opts.ordersListForUserId ?? null, orders);

  const nextCursor =
    hasMore && last ? encodeOrdersShipmentCursor(last.id) : null;

  return {
    orders,
    nextCursor,
    totalCount,
    page,
    hasMore,
    truncated,
  };
}
