import type { OrderChatCorrectionSource, PrismaClient } from "@prisma/client";
import {
  normalizeProstheticsTwinKey,
  stripOrderProstheticsRequestPrefix,
} from "@/lib/order-prosthetics-request";
import { isOrderChatInboxReadNewEnabledForTenant } from "@/lib/order-chat-inbox-dual-read.server";

export type OrderProstheticsRequestReadRow = {
  id: string;
  text: string;
  source: OrderChatCorrectionSource;
  authorLabel: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  rejectedAt: Date | null;
  arrivedAt: Date | null;
};

const requestSelect = {
  id: true,
  text: true,
  source: true,
  authorLabel: true,
  createdAt: true,
  resolvedAt: true,
  rejectedAt: true,
  arrivedAt: true,
  kaitenCommentId: true,
} as const;

function displayText(raw: string): string {
  return stripOrderProstheticsRequestPrefix(raw)?.trim() || raw.trim();
}

function sortRequests(rows: OrderProstheticsRequestReadRow[]): OrderProstheticsRequestReadRow[] {
  return [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

function isPendingProsthetics(row: {
  resolvedAt: Date | null;
  rejectedAt: Date | null;
}): boolean {
  return row.resolvedAt == null && row.rejectedAt == null;
}

/**
 * При дубле по тексту оставляем DEMO_KANBAN (путь Kaiten→канбан→CRM),
 * иначе более новую. Старые строки source=KAITEN схлопываем в пользу канбана.
 */
export function preferPendingProstheticsTwin(
  a: OrderProstheticsRequestReadRow,
  b: OrderProstheticsRequestReadRow,
): OrderProstheticsRequestReadRow {
  if (a.source !== b.source) {
    if (a.source === "DEMO_KANBAN") return a;
    if (b.source === "DEMO_KANBAN") return b;
  }
  return a.createdAt.getTime() >= b.createdAt.getTime() ? a : b;
}

/**
 * Схлопывает pending-пары с одинаковым текстом (в т.ч. legacy KAITEN + канбан),
 * когда отличаются только переносы строк.
 */
export function collapsePendingProstheticsTextTwins(
  rows: OrderProstheticsRequestReadRow[],
): OrderProstheticsRequestReadRow[] {
  const closed: OrderProstheticsRequestReadRow[] = [];
  const pendingByText = new Map<string, OrderProstheticsRequestReadRow>();

  for (const row of rows) {
    if (!isPendingProsthetics(row)) {
      closed.push(row);
      continue;
    }
    const key = normalizeProstheticsTwinKey(displayText(row.text));
    if (!key) {
      closed.push(row);
      continue;
    }
    const prev = pendingByText.get(key);
    if (!prev) {
      pendingByText.set(key, row);
      continue;
    }
    pendingByText.set(key, preferPendingProstheticsTwin(prev, row));
  }

  return sortRequests([...closed, ...pendingByText.values()]);
}

/**
 * Единое чтение заявок «???»: inbox + legacy, без дублей по kaitenCommentId
 * и без pending-дублей Канбан↔Kaiten по тексту.
 */
export async function fetchMergedOrderProstheticsRequests(
  db: PrismaClient,
  orderId: string,
  opts?: { tenantId?: string | null },
): Promise<OrderProstheticsRequestReadRow[]> {
  const oid = orderId.trim();
  if (!oid) return [];

  const legacyRows = await db.orderProstheticsRequest.findMany({
    where: { orderId: oid },
    orderBy: [{ resolvedAt: "asc" }, { createdAt: "asc" }],
    select: requestSelect,
  });

  const useInbox = isOrderChatInboxReadNewEnabledForTenant(opts?.tenantId);
  const inboxRows = useInbox
    ? await (db as any).orderChatInboxItem.findMany({
        where: { orderId: oid, type: "PROSTHETICS" },
        orderBy: { createdAt: "asc" },
        select: requestSelect,
      })
    : [];

  const inboxKaitenIds = new Set<number>();
  const merged: OrderProstheticsRequestReadRow[] = [];

  for (const row of inboxRows as Array<{
    id: string;
    text: string;
    source: OrderChatCorrectionSource;
    authorLabel: string | null;
    createdAt: Date;
    resolvedAt: Date | null;
    rejectedAt: Date | null;
    arrivedAt: Date | null;
    kaitenCommentId: number | null;
  }>) {
    if (row.kaitenCommentId != null) inboxKaitenIds.add(row.kaitenCommentId);
    merged.push({
      id: row.id,
      text: displayText(row.text),
      source: row.source,
      authorLabel: row.authorLabel,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
      rejectedAt: row.rejectedAt,
      arrivedAt: row.arrivedAt,
    });
  }

  for (const row of legacyRows) {
    if (row.kaitenCommentId != null && inboxKaitenIds.has(row.kaitenCommentId)) {
      continue;
    }
    merged.push({
      id: row.id,
      text: row.text,
      source: row.source,
      authorLabel: row.authorLabel,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
      rejectedAt: row.rejectedAt,
      arrivedAt: row.arrivedAt,
    });
  }

  return collapsePendingProstheticsTextTwins(merged);
}

/** Наряды с незакрытыми заявками протетики после merge inbox+legacy. */
export async function orderIdsWithPendingMergedProsthetics(
  db: PrismaClient,
  orderIds: string[],
): Promise<Set<string>> {
  const ids = [...new Set(orderIds.map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) return new Set();

  const [legacyRows, inboxRows] = await Promise.all([
    db.orderProstheticsRequest.findMany({
      where: { orderId: { in: ids } },
      select: {
        orderId: true,
        kaitenCommentId: true,
        resolvedAt: true,
        rejectedAt: true,
      },
    }),
    (db as any).orderChatInboxItem.findMany({
      where: { orderId: { in: ids }, type: "PROSTHETICS" },
      select: {
        orderId: true,
        kaitenCommentId: true,
        resolvedAt: true,
        rejectedAt: true,
      },
    }) as Promise<
      Array<{
        orderId: string;
        kaitenCommentId: number | null;
        resolvedAt: Date | null;
        rejectedAt: Date | null;
      }>
    >,
  ]);

  type Soft = {
    kaitenCommentId: number | null;
    resolvedAt: Date | null;
    rejectedAt: Date | null;
  };
  const byOrder = new Map<string, { inbox: Soft[]; legacy: Soft[] }>();
  for (const id of ids) byOrder.set(id, { inbox: [], legacy: [] });
  for (const row of inboxRows) {
    byOrder.get(row.orderId)?.inbox.push(row);
  }
  for (const row of legacyRows) {
    byOrder.get(row.orderId)?.legacy.push(row);
  }

  const pending = new Set<string>();
  for (const [orderId, packs] of byOrder) {
    const inboxKaitenIds = new Set<number>();
    let hasPending = false;
    for (const row of packs.inbox) {
      if (row.kaitenCommentId != null) inboxKaitenIds.add(row.kaitenCommentId);
      if (row.resolvedAt == null && row.rejectedAt == null) hasPending = true;
    }
    for (const row of packs.legacy) {
      if (
        row.kaitenCommentId != null &&
        inboxKaitenIds.has(row.kaitenCommentId)
      ) {
        continue;
      }
      if (row.resolvedAt == null && row.rejectedAt == null) hasPending = true;
    }
    if (hasPending) pending.add(orderId);
  }
  return pending;
}

/** @deprecated используйте orderIdsWithPendingMergedProsthetics */
export async function orderIdsWithPendingInboxProsthetics(
  db: PrismaClient,
  orderIds: string[],
): Promise<Set<string>> {
  return orderIdsWithPendingMergedProsthetics(db, orderIds);
}

export async function hydrateListPendingProstheticsFromInbox<
  T extends { id: string; listPendingProstheticsRequests: boolean },
>(db: PrismaClient, rows: T[]): Promise<T[]> {
  if (rows.length === 0) return rows;
  const pendingIds = await orderIdsWithPendingMergedProsthetics(
    db,
    rows.map((r) => r.id),
  );
  return rows.map((row) => ({
    ...row,
    listPendingProstheticsRequests: pendingIds.has(row.id),
  }));
}
