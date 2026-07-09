import type { OrderChatCorrectionSource, PrismaClient } from "@prisma/client";
import { stripOrderChatCorrectionPrefix } from "@/lib/order-chat-correction";
import { isOrderChatInboxReadNewEnabledForTenant } from "@/lib/order-chat-inbox-dual-read.server";

export type OrderChatCorrectionReadRow = {
  id: string;
  text: string;
  source: OrderChatCorrectionSource;
  authorLabel: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  rejectedAt: Date | null;
};

const correctionSelect = {
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
  return stripOrderChatCorrectionPrefix(raw)?.trim() || raw.trim();
}

function sortCorrections(rows: OrderChatCorrectionReadRow[]): OrderChatCorrectionReadRow[] {
  return [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * Единое чтение корректировок: inbox (новое) + legacy, без дублей по kaitenCommentId.
 * Иначе опрос GET /chat-corrections затирал legacy-записи пустым inbox.
 */
export async function fetchMergedOrderChatCorrections(
  db: PrismaClient,
  orderId: string,
  opts?: { tenantId?: string | null },
): Promise<OrderChatCorrectionReadRow[]> {
  const oid = orderId.trim();
  if (!oid) return [];

  const legacyRows = await db.orderChatCorrection.findMany({
    where: { orderId: oid },
    orderBy: [{ resolvedAt: "asc" }, { createdAt: "asc" }],
    select: correctionSelect,
  });

  const useInbox = isOrderChatInboxReadNewEnabledForTenant(opts?.tenantId);
  const inboxRows = useInbox
    ? await (db as any).orderChatInboxItem.findMany({
        where: { orderId: oid, type: "CORRECTION" },
        orderBy: { createdAt: "asc" },
        select: correctionSelect,
      })
    : [];

  const inboxKaitenIds = new Set<number>();
  const merged: OrderChatCorrectionReadRow[] = [];

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

  return sortCorrections(merged);
}

/** Наряды с незакрытыми корректировками в inbox (дополнение к legacy relation). */
export async function orderIdsWithPendingInboxCorrections(
  db: PrismaClient,
  orderIds: string[],
): Promise<Set<string>> {
  const ids = [...new Set(orderIds.map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) return new Set();

  const rows = await (db as any).orderChatInboxItem.findMany({
    where: {
      orderId: { in: ids },
      type: "CORRECTION",
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

export async function hydrateListPendingChatCorrectionsFromInbox<
  T extends { id: string; listPendingChatCorrections: boolean },
>(db: PrismaClient, rows: T[]): Promise<T[]> {
  if (rows.length === 0) return rows;
  const inboxPending = await orderIdsWithPendingInboxCorrections(
    db,
    rows.map((r) => r.id),
  );
  if (inboxPending.size === 0) return rows;
  return rows.map((row) =>
    row.listPendingChatCorrections || inboxPending.has(row.id)
      ? { ...row, listPendingChatCorrections: true }
      : row,
  );
}
