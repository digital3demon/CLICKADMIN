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

function isPendingCorrection(row: {
  resolvedAt: Date | null;
  rejectedAt: Date | null;
}): boolean {
  return row.resolvedAt == null && row.rejectedAt == null;
}

/** При дубле Канбан+Kaiten по тексту оставляем KAITEN, иначе более новую. */
export function preferPendingCorrectionTwin(
  a: OrderChatCorrectionReadRow,
  b: OrderChatCorrectionReadRow,
): OrderChatCorrectionReadRow {
  if (a.source !== b.source) {
    if (a.source === "KAITEN") return a;
    if (b.source === "KAITEN") return b;
  }
  return a.createdAt.getTime() >= b.createdAt.getTime() ? a : b;
}

/**
 * Схлопывает pending-пары с одинаковым текстом (CRM DEMO_KANBAN + Kaiten twin).
 * Закрытые строки не трогаем.
 */
export function collapsePendingCorrectionTextTwins(
  rows: OrderChatCorrectionReadRow[],
): OrderChatCorrectionReadRow[] {
  const closed: OrderChatCorrectionReadRow[] = [];
  const pendingByText = new Map<string, OrderChatCorrectionReadRow>();

  for (const row of rows) {
    if (!isPendingCorrection(row)) {
      closed.push(row);
      continue;
    }
    const key = displayText(row.text).toLowerCase();
    if (!key) {
      closed.push(row);
      continue;
    }
    const prev = pendingByText.get(key);
    if (!prev) {
      pendingByText.set(key, row);
      continue;
    }
    pendingByText.set(key, preferPendingCorrectionTwin(prev, row));
  }

  return sortCorrections([...closed, ...pendingByText.values()]);
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
      text: displayText(row.text),
      source: row.source,
      authorLabel: row.authorLabel,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
      rejectedAt: row.rejectedAt,
    });
  }

  return collapsePendingCorrectionTextTwins(merged);
}

/** Наряды с незакрытыми корректировками после merge inbox+legacy (без дублей по kaitenCommentId). */
export async function orderIdsWithPendingMergedCorrections(
  db: PrismaClient,
  orderIds: string[],
): Promise<Set<string>> {
  const ids = [...new Set(orderIds.map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) return new Set();

  const [legacyRows, inboxRows] = await Promise.all([
    db.orderChatCorrection.findMany({
      where: { orderId: { in: ids } },
      select: {
        orderId: true,
        kaitenCommentId: true,
        resolvedAt: true,
        rejectedAt: true,
      },
    }),
    (db as any).orderChatInboxItem.findMany({
      where: { orderId: { in: ids }, type: "CORRECTION" },
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

/** @deprecated используйте orderIdsWithPendingMergedCorrections */
export async function orderIdsWithPendingInboxCorrections(
  db: PrismaClient,
  orderIds: string[],
): Promise<Set<string>> {
  return orderIdsWithPendingMergedCorrections(db, orderIds);
}

export async function hydrateListPendingChatCorrectionsFromInbox<
  T extends { id: string; listPendingChatCorrections: boolean },
>(db: PrismaClient, rows: T[]): Promise<T[]> {
  if (rows.length === 0) return rows;
  const pendingIds = await orderIdsWithPendingMergedCorrections(
    db,
    rows.map((r) => r.id),
  );
  return rows.map((row) => ({
    ...row,
    listPendingChatCorrections: pendingIds.has(row.id),
  }));
}

/** Число нарядов тенанта с ≥1 непринятой корректировкой (после merge). */
export async function countOrdersWithPendingMergedCorrections(
  db: PrismaClient,
  tenantId: string,
): Promise<number> {
  const tid = tenantId.trim();
  if (!tid) return 0;

  const [legacyRows, inboxRows] = await Promise.all([
    db.orderChatCorrection.findMany({
      where: {
        resolvedAt: null,
        rejectedAt: null,
        order: { tenantId: tid, archivedAt: null },
      },
      select: { orderId: true },
      distinct: ["orderId"],
    }),
    (db as any).orderChatInboxItem.findMany({
      where: {
        type: "CORRECTION",
        resolvedAt: null,
        rejectedAt: null,
        order: { tenantId: tid, archivedAt: null },
      },
      select: { orderId: true },
      distinct: ["orderId"],
    }) as Promise<Array<{ orderId: string }>>,
  ]);

  const candidateIds = [
    ...new Set([
      ...legacyRows.map((r) => r.orderId),
      ...inboxRows.map((r) => r.orderId),
    ]),
  ];
  if (candidateIds.length === 0) return 0;
  return (await orderIdsWithPendingMergedCorrections(db, candidateIds)).size;
}
