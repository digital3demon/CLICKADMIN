import type { OrderChatCorrectionSource, PrismaClient } from "@prisma/client";
import { stripOrderProstheticsRequestPrefix } from "@/lib/order-prosthetics-request";
import { isOrderChatInboxReadNewEnabledForTenant } from "@/lib/order-chat-inbox-dual-read.server";

export type OrderProstheticsRequestReadRow = {
  id: string;
  text: string;
  source: OrderChatCorrectionSource;
  authorLabel: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  rejectedAt: Date | null;
};

const requestSelect = {
  id: true,
  text: true,
  source: true,
  authorLabel: true,
  createdAt: true,
  resolvedAt: true,
  rejectedAt: true,
  kaitenCommentId: true,
} as const;

function displayText(raw: string): string {
  return stripOrderProstheticsRequestPrefix(raw)?.trim() || raw.trim();
}

function sortRequests(rows: OrderProstheticsRequestReadRow[]): OrderProstheticsRequestReadRow[] {
  return [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * Единое чтение заявок «???»: inbox + legacy, без дублей по kaitenCommentId.
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
    });
  }

  return sortRequests(merged);
}

export async function orderIdsWithPendingInboxProsthetics(
  db: PrismaClient,
  orderIds: string[],
): Promise<Set<string>> {
  const ids = [...new Set(orderIds.map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) return new Set();

  const rows = await (db as any).orderChatInboxItem.findMany({
    where: {
      orderId: { in: ids },
      type: "PROSTHETICS",
      resolvedAt: null,
      rejectedAt: null,
    },
    select: { orderId: true },
    distinct: ["orderId"],
  });

  return new Set(
    (rows as Array<{ orderId: string }>).map((r) => r.orderId),
  );
}

export async function hydrateListPendingProstheticsFromInbox<
  T extends { id: string; listPendingProstheticsRequests: boolean },
>(db: PrismaClient, rows: T[]): Promise<T[]> {
  if (rows.length === 0) return rows;
  const inboxPending = await orderIdsWithPendingInboxProsthetics(
    db,
    rows.map((r) => r.id),
  );
  if (inboxPending.size === 0) return rows;
  return rows.map((row) =>
    row.listPendingProstheticsRequests || inboxPending.has(row.id)
      ? { ...row, listPendingProstheticsRequests: true }
      : row,
  );
}
