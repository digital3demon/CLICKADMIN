import type { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { getClientsPrisma } from "@/lib/get-domain-prisma";
import {
  listTagWhere,
  orderAttentionListSupersetWhere,
  parseListTagParam,
} from "@/lib/order-list-tag-filter";
import {
  decodeOrdersListCursor,
  encodeOrdersListCursor,
} from "@/lib/orders-list-cursor";
import { orderInvoiceCompositionMismatch } from "@/lib/order-invoice-composition-mismatch";

/** Поля списка заказов (страница «Заказы» и GET /api/orders). */
export const ordersListPageSelect = {
  id: true,
  orderNumber: true,
  status: true,
  prostheticsOrdered: true,
  invoicePrinted: true,
  invoiceAttachmentId: true,
  adminShippedOtpr: true,
  kaitenCardId: true,
  demoKanbanColumn: true,
  kaitenCardType: { select: { id: true, name: true } },
  kaitenColumnTitle: true,
  kaitenBlocked: true,
  kaitenBlockReason: true,
  labWorkStatus: true,
  isUrgent: true,
  urgentCoefficient: true,
  compositionDiscountPercent: true,
  patientName: true,
  appointmentDate: true,
  workReceivedAt: true,
  dueToAdminsAt: true,
  createdAt: true,
  dueDate: true,
  invoiceParsedTotalRub: true,
  clinicId: true,
  doctorId: true,
  listCustomTags: { select: { id: true, label: true } },
  constructions: {
    select: { quantity: true, unitPrice: true, lineDiscountPercent: true },
  },
  chatCorrections: {
    where: { resolvedAt: null, rejectedAt: null },
    select: { id: true },
    take: 1,
  },
  prostheticsRequests: {
    where: { resolvedAt: null, rejectedAt: null },
    select: { id: true },
    take: 1,
  },
} as const;

type OrderListPageRowRaw = Prisma.OrderGetPayload<{
  select: typeof ordersListPageSelect;
}>;

export type OrderListPageRow = Omit<
  OrderListPageRowRaw,
  "constructions" | "chatCorrections" | "prostheticsRequests" | "clinicId" | "doctorId"
> & {
  clinic: { id: string; name: string; address: string | null } | null;
  doctor: { id: string; fullName: string };
  listCompositionMismatch: boolean;
  listPendingChatCorrections: boolean;
  listPendingProstheticsRequests: boolean;
};

function toOrderListPageRow(o: OrderListPageRowRaw): OrderListPageRow {
  const {
    constructions,
    chatCorrections,
    prostheticsRequests,
    clinicId,
    doctorId,
    ...rest
  } = o;
  return {
    ...rest,
    clinic: clinicId ? { id: clinicId, name: "—", address: null } : null,
    doctor: { id: doctorId, fullName: "—" },
    listCompositionMismatch: orderInvoiceCompositionMismatch({
      invoiceParsedTotalRub: o.invoiceParsedTotalRub,
      isUrgent: o.isUrgent,
      urgentCoefficient: o.urgentCoefficient,
      compositionDiscountPercent: o.compositionDiscountPercent,
      constructions,
    }),
    listPendingChatCorrections: (chatCorrections?.length ?? 0) > 0,
    listPendingProstheticsRequests: (prostheticsRequests?.length ?? 0) > 0,
  };
}

async function fetchOrdersListPageAttentionFiltered(
  db: PrismaClient,
  baseParts: Prisma.OrderWhereInput[],
  dec: { c: string; i: string } | null,
  take: number,
  pageSize: number,
): Promise<{ orders: OrderListPageRow[]; nextCursor: string | null }> {
  const batchSize = Math.max(80, take * 4);
  let seek: { c: Date; i: string } | null = dec
    ? { c: new Date(dec.c), i: dec.i }
    : null;
  const collected: OrderListPageRow[] = [];
  let lastBatchFull = false;

  for (let iter = 0; iter < 50 && collected.length < take; iter++) {
    const cursorPart: Prisma.OrderWhereInput = seek
      ? {
          OR: [
            { createdAt: { lt: seek.c } },
            {
              AND: [{ createdAt: seek.c }, { id: { lt: seek.i } }],
            },
          ],
        }
      : {};

    const batchParts = [...baseParts, cursorPart];
    const where: Prisma.OrderWhereInput =
      batchParts.length === 1 ? batchParts[0]! : { AND: batchParts };

    const rows = await db.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: batchSize,
      select: ordersListPageSelect,
    });

    if (rows.length === 0) break;
    lastBatchFull = rows.length === batchSize;

    for (const o of rows) {
      const row = toOrderListPageRow(o);
      if (row.listPendingChatCorrections || row.listCompositionMismatch) {
        collected.push(row);
        if (collected.length >= take) break;
      }
    }

    const lastRow = rows[rows.length - 1]!;
    seek = { c: lastRow.createdAt, i: lastRow.id };
    if (!lastBatchFull) break;
  }

  const hasMore =
    collected.length > pageSize ||
    (collected.length === pageSize && lastBatchFull);

  const page = collected.slice(0, pageSize);
  const lastOut = page[page.length - 1];
  const nextCursor =
    hasMore && lastOut
      ? encodeOrdersListCursor(lastOut.createdAt, lastOut.id)
      : null;

  return { orders: page, nextCursor };
}

async function ordersSearchWhere(
  needle: string,
): Promise<Prisma.OrderWhereInput> {
  const n = needle.trim();
  if (!n) return {};
  const clientsPrisma = await getClientsPrisma();
  const [doctors, clinics] = await Promise.all([
    clientsPrisma.doctor.findMany({
      where: { fullName: { contains: n } },
      select: { id: true },
      take: 100,
    }),
    clientsPrisma.clinic.findMany({
      where: { name: { contains: n } },
      select: { id: true },
      take: 100,
    }),
  ]);
  const doctorIds = doctors.map((x) => x.id);
  const clinicIds = clinics.map((x) => x.id);
  return {
    OR: [
      { orderNumber: { contains: n } },
      { patientName: { contains: n } },
      ...(doctorIds.length > 0 ? [{ doctorId: { in: doctorIds } }] : []),
      ...(clinicIds.length > 0 ? [{ clinicId: { in: clinicIds } }] : []),
    ],
  };
}

async function hydrateContractors(
  rows: OrderListPageRow[],
): Promise<OrderListPageRow[]> {
  if (rows.length === 0) return rows;
  const doctorIds = Array.from(new Set(rows.map((r) => r.doctor?.id).filter(Boolean))) as string[];
  const clinicIds = Array.from(new Set(rows.map((r) => r.clinic?.id).filter(Boolean))) as string[];
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
      doctor: {
        id: row.doctor.id,
        fullName: d?.fullName ?? "—",
      },
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

export async function fetchOrdersListPage(
  db: PrismaClient,
  opts: {
    /** Изоляция SaaS: только наряды этой организации */
    tenantId: string;
    cursor: string | null | undefined;
    pageSize: number;
    /** Сырой query `tag` (как в URL, будет декодирован). */
    tag?: string | null | undefined;
    /** Не показывать наряды с adminShippedOtpr = true. */
    hideShipped?: boolean;
    /** Только наряды с adminShippedOtpr = true (если задано, hideShipped игнорируется). */
    onlyShipped?: boolean;
    /** Поиск по номеру наряда, пациенту, врачу, клинике (подстрока, без учёта регистра). */
    search?: string | null | undefined;
    /** Фильтр по дате создания наряда (МСК), границы [start, endExclusive). */
    createdAtRange?: { start: Date; endExclusive: Date } | null | undefined;
  },
): Promise<{
  orders: OrderListPageRow[];
  nextCursor: string | null;
}> {
  const dec = decodeOrdersListCursor(opts.cursor ?? undefined);
  const take = opts.pageSize + 1;

  const tagDecoded =
    opts.tag != null && String(opts.tag).trim()
      ? String(opts.tag).trim()
      : null;
  const parsedTag = parseListTagParam(tagDecoded);

  const cursorWhere: Prisma.OrderWhereInput = dec
    ? {
        OR: [
          { createdAt: { lt: new Date(dec.c) } },
          {
            AND: [
              { createdAt: new Date(dec.c) },
              { id: { lt: dec.i } },
            ],
          },
        ],
      }
    : {};

  const parts: Prisma.OrderWhereInput[] = [
    { tenantId: opts.tenantId },
    { archivedAt: null },
  ];
  if (parsedTag) {
    if (parsedTag.kind === "orderAttention") {
      parts.push(orderAttentionListSupersetWhere());
    } else {
      parts.push(listTagWhere(parsedTag));
    }
  }
  if (opts.onlyShipped) {
    parts.push({ adminShippedOtpr: true });
  } else if (opts.hideShipped) {
    parts.push({ adminShippedOtpr: false });
  }
  const searchTrim =
    opts.search != null && String(opts.search).trim()
      ? String(opts.search).trim()
      : "";
  if (searchTrim) {
    parts.push(await ordersSearchWhere(searchTrim));
  }
  if (opts.createdAtRange) {
    parts.push({
      createdAt: {
        gte: opts.createdAtRange.start,
        lt: opts.createdAtRange.endExclusive,
      },
    });
  }

  if (parsedTag?.kind === "orderAttention") {
    const attention = await fetchOrdersListPageAttentionFiltered(
      db,
      parts,
      dec,
      take,
      opts.pageSize,
    );
    return {
      ...attention,
      orders: await hydrateContractors(attention.orders),
    };
  }

  if (dec) parts.push(cursorWhere);
  const where: Prisma.OrderWhereInput =
    parts.length === 0 ? {} : parts.length === 1 ? parts[0]! : { AND: parts };

  const rows = await db.order.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: ordersListPageSelect,
  });

  const hasMore = rows.length > opts.pageSize;
  const page = hasMore ? rows.slice(0, opts.pageSize) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeOrdersListCursor(last.createdAt, last.id)
      : null;

  const orders = await hydrateContractors(page.map((o) => toOrderListPageRow(o)));

  return { orders, nextCursor };
}
