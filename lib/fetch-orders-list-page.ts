import type { Prisma } from "@prisma/client";
import type { PrismaClient, UserRole } from "@prisma/client";
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
import { withKeptOrderIds } from "@/lib/orders-list-keep-where";
import { hydrateOrderKaitenLabMentionHighlight } from "@/lib/hydrate-order-kaiten-lab-mention-highlight";
import { hydrateListPendingChatCorrectionsFromInbox } from "@/lib/order-chat-corrections-read";
import { hydrateListPendingProstheticsFromInbox } from "@/lib/order-prosthetics-requests-read";
import { orderTestVisibilityWhere } from "@/lib/order-test-visibility";
import {
  extractOrderNumberFromSearchQuery,
  orderSearchPrismaNeedles,
} from "@/lib/order-search-query";

/** Поля списка заказов (страница «Заказы» и GET /api/orders). */
export const ordersListPageSelect = {
  id: true,
  orderNumber: true,
  status: true,
  prostheticsOrdered: true,
  invoicePrinted: true,
  invoicePaperDocs: true,
  invoiceSentToEdo: true,
  invoiceEdoSigned: true,
  invoiceAttachmentId: true,
  invoiceNumber: true,
  updAttachmentId: true,
  updNumber: true,
  updPrinted: true,
  payment: true,
  paymentPartialRub: true,
  adminShippedOtpr: true,
  adminShippedAt: true,
  kaitenCardId: true,
  kaitenChatHasLabMention: true,
  kaitenLabMentionSignalAt: true,
  demoKanbanColumn: true,
  kaitenCardType: { select: { id: true, name: true } },
  kaitenColumnTitle: true,
  kaitenTrackLane: true,
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
  dueToAdminsHasTime: true,
  createdAt: true,
  dueDate: true,
  listAdminMemo: true,
  listTechMemo: true,
  invoiceParsedTotalRub: true,
  invoiceMismatchAckFingerprint: true,
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
  /** Нужна ли янтарная индикация чата для текущего пользователя (с учётом ack в БД). */
  listKaitenLabMentionHighlight: boolean;
};

export function toOrderListPageRow(o: OrderListPageRowRaw): OrderListPageRow {
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
      invoiceMismatchAckFingerprint: o.invoiceMismatchAckFingerprint,
      isUrgent: o.isUrgent,
      urgentCoefficient: o.urgentCoefficient,
      compositionDiscountPercent: o.compositionDiscountPercent,
      constructions,
    }),
    listPendingChatCorrections: (chatCorrections?.length ?? 0) > 0,
    listPendingProstheticsRequests: (prostheticsRequests?.length ?? 0) > 0,
    listKaitenLabMentionHighlight: false,
  };
}

async function hydrateKaitenLabMentionForOrdersList(
  db: PrismaClient,
  userId: string | null | undefined,
  rows: OrderListPageRow[],
): Promise<OrderListPageRow[]> {
  return hydrateOrderKaitenLabMentionHighlight(db, userId, rows);
}

type OrdersListInMemoryPageOpts = {
  pageSize: number;
  /** Сколько совпадений пропустить с начала списка (offset). При курсоре — 0. */
  skip: number;
  cursorDec: { c: string; i: string } | null;
};

type OrdersListInMemoryPageResult = {
  orders: OrderListPageRow[];
  nextCursor: string | null;
  /** null — скан не дошёл до конца, последнюю страницу не рисуем. */
  totalCount: number | null;
  hasMore: boolean;
};

/**
 * Фильтры, которые нельзя выразить одним WHERE (внимание / упоминания в чате):
 * сканируем батчами, собираем совпадения, режем skip/take.
 */
async function collectMatchingOrdersListPage(
  db: PrismaClient,
  baseParts: Prisma.OrderWhereInput[],
  opts: OrdersListInMemoryPageOpts,
  matchRow: (row: OrderListPageRow) => boolean,
  mapBatch?: (rows: OrderListPageRow[]) => Promise<OrderListPageRow[]>,
): Promise<OrdersListInMemoryPageResult> {
  const { pageSize, skip, cursorDec } = opts;
  const need = skip + pageSize + 1;
  const batchSize = Math.max(80, Math.min(500, pageSize * 4));
  let seek: { c: Date; i: string } | null = cursorDec
    ? { c: new Date(cursorDec.c), i: cursorDec.i }
    : null;
  const collected: OrderListPageRow[] = [];
  let lastBatchFull = false;

  for (let iter = 0; iter < 120 && collected.length < need; iter++) {
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

    let mapped = rows.map((o) => toOrderListPageRow(o));
    if (mapBatch) mapped = await mapBatch(mapped);
    for (const row of mapped) {
      if (matchRow(row)) {
        collected.push(row);
        if (collected.length >= need) break;
      }
    }

    const lastRow = rows[rows.length - 1]!;
    seek = { c: lastRow.createdAt, i: lastRow.id };
    if (!lastBatchFull) break;
  }

  const hasMore = collected.length > skip + pageSize;
  const page = collected.slice(skip, skip + pageSize);
  const lastOut = page[page.length - 1];
  const nextCursor =
    hasMore && lastOut
      ? encodeOrdersListCursor(lastOut.createdAt, lastOut.id)
      : null;
  const scanExhausted = !lastBatchFull;
  const totalCount =
    cursorDec != null ? null : scanExhausted ? collected.length : null;

  return { orders: page, nextCursor, totalCount, hasMore };
}

async function fetchOrdersListPageAttentionFiltered(
  db: PrismaClient,
  baseParts: Prisma.OrderWhereInput[],
  pageOpts: OrdersListInMemoryPageOpts,
): Promise<OrdersListInMemoryPageResult> {
  return collectMatchingOrdersListPage(
    db,
    baseParts,
    pageOpts,
    (row) => row.listPendingChatCorrections || row.listCompositionMismatch,
  );
}

async function fetchOrdersListPageLabMentionFiltered(
  db: PrismaClient,
  baseParts: Prisma.OrderWhereInput[],
  pageOpts: OrdersListInMemoryPageOpts,
  userId: string | null | undefined,
): Promise<OrdersListInMemoryPageResult> {
  return collectMatchingOrdersListPage(
    db,
    baseParts,
    pageOpts,
    (row) => row.listKaitenLabMentionHighlight,
    (rows) => hydrateKaitenLabMentionForOrdersList(db, userId ?? null, rows),
  );
}

async function ordersSearchTokenWhere(
  token: string,
  tenantId?: string | null,
): Promise<Prisma.OrderWhereInput> {
  const clientsPrisma = await getClientsPrisma();
  const [doctors, clinics] = await Promise.all([
    clientsPrisma.doctor.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        fullName: { contains: token, mode: "insensitive" },
      },
      select: { id: true },
      take: 100,
    }),
    clientsPrisma.clinic.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        name: { contains: token, mode: "insensitive" },
      },
      select: { id: true },
      take: 100,
    }),
  ]);
  const doctorIds = doctors.map((x) => x.id);
  const clinicIds = clinics.map((x) => x.id);
  return {
    OR: [
      { orderNumber: { contains: token, mode: "insensitive" } },
      { patientName: { contains: token, mode: "insensitive" } },
      ...(doctorIds.length > 0 ? [{ doctorId: { in: doctorIds } }] : []),
      ...(clinicIds.length > 0 ? [{ clinicId: { in: clinicIds } }] : []),
    ],
  };
}

export async function ordersSearchWhere(
  needle: string,
  tenantId?: string | null,
): Promise<Prisma.OrderWhereInput> {
  const n = needle.trim();
  if (!n) return {};
  const orderNumber = extractOrderNumberFromSearchQuery(n);
  if (orderNumber) {
    return { orderNumber: { contains: orderNumber, mode: "insensitive" } };
  }
  const tokens = orderSearchPrismaNeedles(n);
  if (tokens.length === 0) return {};
  if (tokens.length === 1) return ordersSearchTokenWhere(tokens[0]!, tenantId);
  const parts = await Promise.all(
    tokens.map((t) => ordersSearchTokenWhere(t, tenantId)),
  );
  return { AND: parts };
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

export type FetchOrdersListPageResult = {
  orders: OrderListPageRow[];
  nextCursor: string | null;
  /** null — неизвестно (курсор или неполный in-memory скан). */
  totalCount: number | null;
  page: number;
  hasMore: boolean;
};

export async function fetchOrdersListPage(
  db: PrismaClient,
  opts: {
    /** Изоляция SaaS: только наряды этой организации */
    tenantId: string;
    cursor: string | null | undefined;
    /** 1-based. Если задан — offset (`skip`), курсор игнорируется. */
    page?: number | null;
    pageSize: number;
    /** Сырой query `tag` (как в URL, будет декодирован). */
    tag?: string | null | undefined;
    /** Не показывать наряды с adminShippedOtpr = true. */
    hideShipped?: boolean;
    /** Только наряды с adminShippedOtpr = true (если задано, hideShipped игнорируется). */
    onlyShipped?: boolean;
    /** Поиск: номер YYMM-NNN из строки документооборота или токены (пациент / врач / клиника). */
    search?: string | null | undefined;
    /** Фильтр по дате создания наряда (МСК), границы [start, endExclusive). */
    createdAtRange?: { start: Date; endExclusive: Date } | null | undefined;
    /** Период по лабораторному сроку (dueDate / колонка «ЛАБ»), МСК. */
    dueDateRange?: { start: Date; endExclusive: Date } | null | undefined;
    /** Наряды, которые оставляем в списке после смены срока при активном фильтре по дате. */
    keepOrderIds?: readonly string[] | null;
    /** Период по дате отправки (adminShippedAt / колонка «Отправка»), МСК. */
    otprAtRange?: { start: Date; endExclusive: Date } | null | undefined;
    /** Для подсветки «Упоминания»: учитываем OrderKaitenLabMentionAck текущего пользователя. */
    ordersListForUserId?: string | null;
    viewerRole?: UserRole | null;
    viewerUserId?: string | null;
  },
): Promise<FetchOrdersListPageResult> {
  const cursorDec = decodeOrdersListCursor(opts.cursor ?? undefined);
  const useOffset = opts.page != null || !cursorDec;
  const pageNum = useOffset
    ? Math.max(1, Math.floor(opts.page ?? 1))
    : 1;
  const skip = useOffset ? (pageNum - 1) * opts.pageSize : 0;
  const dec = useOffset ? null : cursorDec;

  const tagDecoded =
    opts.tag != null && String(opts.tag).trim()
      ? String(opts.tag).trim()
      : null;
  const parsedTag = parseListTagParam(tagDecoded);

  const inMemoryPageOpts: OrdersListInMemoryPageOpts = {
    pageSize: opts.pageSize,
    skip,
    cursorDec: dec,
  };

  const parts: Prisma.OrderWhereInput[] = [
    { tenantId: opts.tenantId },
    { archivedAt: null },
    orderTestVisibilityWhere({
      viewerRole: opts.viewerRole ?? null,
      viewerUserId: opts.viewerUserId ?? opts.ordersListForUserId ?? null,
    }),
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
    parts.push(await ordersSearchWhere(searchTrim, opts.tenantId));
  }
  if (opts.dueDateRange) {
    parts.push(
      withKeptOrderIds(
        {
          dueDate: {
            gte: opts.dueDateRange.start,
            lt: opts.dueDateRange.endExclusive,
          },
        },
        opts.keepOrderIds,
      ),
    );
  } else if (opts.createdAtRange) {
    // Совместимость со старыми вызовами API.
    parts.push({
      createdAt: {
        gte: opts.createdAtRange.start,
        lt: opts.createdAtRange.endExclusive,
      },
    });
  }
  if (opts.otprAtRange) {
    parts.push({
      adminShippedAt: {
        gte: opts.otprAtRange.start,
        lt: opts.otprAtRange.endExclusive,
      },
    });
  }

  if (parsedTag?.kind === "orderAttention") {
    const attention = await fetchOrdersListPageAttentionFiltered(
      db,
      parts,
      inMemoryPageOpts,
    );
    return {
      ...attention,
      page: pageNum,
      orders: await hydrateListPendingProstheticsFromInbox(
        db,
        await hydrateListPendingChatCorrectionsFromInbox(
          db,
          await hydrateKaitenLabMentionForOrdersList(
            db,
            opts.ordersListForUserId ?? null,
            await hydrateContractors(attention.orders),
          ),
        ),
      ),
    };
  }
  if (parsedTag?.kind === "kaitenLabMention") {
    const mentions = await fetchOrdersListPageLabMentionFiltered(
      db,
      parts,
      inMemoryPageOpts,
      opts.ordersListForUserId ?? null,
    );
    return {
      ...mentions,
      page: pageNum,
      orders: await hydrateContractors(mentions.orders),
    };
  }

  const where: Prisma.OrderWhereInput =
    parts.length === 0 ? {} : parts.length === 1 ? parts[0]! : { AND: parts };

  async function hydratePageRows(
    raw: OrderListPageRowRaw[],
  ): Promise<OrderListPageRow[]> {
    const orders = await hydrateContractors(raw.map((o) => toOrderListPageRow(o)));
    return hydrateListPendingProstheticsFromInbox(
      db,
      await hydrateListPendingChatCorrectionsFromInbox(
        db,
        await hydrateKaitenLabMentionForOrdersList(
          db,
          opts.ordersListForUserId ?? null,
          orders,
        ),
      ),
    );
  }

  if (useOffset) {
    let page = pageNum;
    let skipNow = skip;
    let [rows, totalCount] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: skipNow,
        take: opts.pageSize,
        select: ordersListPageSelect,
      }),
      db.order.count({ where }),
    ]);
    if (totalCount > 0 && skipNow >= totalCount) {
      page = Math.max(1, Math.ceil(totalCount / opts.pageSize));
      skipNow = (page - 1) * opts.pageSize;
      rows = await db.order.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: skipNow,
        take: opts.pageSize,
        select: ordersListPageSelect,
      });
    }
    const hasMore = skipNow + rows.length < totalCount;
    const last = rows[rows.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeOrdersListCursor(last.createdAt, last.id)
        : null;
    return {
      orders: await hydratePageRows(rows),
      nextCursor,
      totalCount,
      page,
      hasMore,
    };
  }

  const take = opts.pageSize + 1;
  const cursorWhere: Prisma.OrderWhereInput = dec
    ? {
        OR: [
          { createdAt: { lt: new Date(dec.c) } },
          {
            AND: [{ createdAt: new Date(dec.c) }, { id: { lt: dec.i } }],
          },
        ],
      }
    : {};
  const cursorParts = dec ? [...parts, cursorWhere] : parts;
  const cursorListWhere: Prisma.OrderWhereInput =
    cursorParts.length === 0
      ? {}
      : cursorParts.length === 1
        ? cursorParts[0]!
        : { AND: cursorParts };

  const rows = await db.order.findMany({
    where: cursorListWhere,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: ordersListPageSelect,
  });

  const hasMore = rows.length > opts.pageSize;
  const pageRows = hasMore ? rows.slice(0, opts.pageSize) : rows;
  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeOrdersListCursor(last.createdAt, last.id)
      : null;

  return {
    orders: await hydratePageRows(pageRows),
    nextCursor,
    totalCount: null,
    page: 1,
    hasMore,
  };
}
