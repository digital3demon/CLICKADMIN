import type { PrismaClient } from "@prisma/client";
import { kaitenChatPriorityColumnTitles } from "@/lib/kaiten-chat-priority";
import { getKaitenRestAuth } from "@/lib/kaiten-rest";
import { syncKaitenChatCommentsForOrderIds } from "@/lib/order-chat-correction-kaiten-sync";
import { fetchOrderChatToastRows } from "@/lib/order-chat-toasts.server";

const TOAST_KAITEN_SYNC_GAP_MS = 5_000;
const TOAST_KAITEN_SYNC_BATCH = 10;
const TOAST_KAITEN_MENTION_BOOST = 4;

const tenantToastSyncAt = new Map<string, number>();

export type OrderNotificationToastRow = {
  id: string;
  text: string;
  authorLabel: string | null;
  orderId: string;
  orderNumber: string;
  createdAt: string;
};

async function pickOrderIdsForToastKaitenSync(
  db: PrismaClient,
  tenantId: string,
  take: number,
): Promise<string[]> {
  const picked = new Set<string>();
  const baseWhere = {
    tenantId,
    archivedAt: null,
    kaitenCardId: { not: null },
  } as const;

  const mentionRows = await db.order.findMany({
    where: {
      ...baseWhere,
      kaitenChatHasLabMention: true,
      kaitenLabMentionSignalAt: { not: null },
    },
    orderBy: [{ kaitenChatSyncedAt: "asc" }, { id: "asc" }],
    take: Math.min(TOAST_KAITEN_MENTION_BOOST, take),
    select: { id: true },
  });
  for (const r of mentionRows) picked.add(r.id);

  const priority = kaitenChatPriorityColumnTitles();
  if (picked.size < take && priority.length > 0) {
    const staleRows = await db.order.findMany({
      where: {
        ...baseWhere,
        kaitenColumnTitle: { in: priority },
        ...(picked.size > 0 ? { id: { notIn: [...picked] } } : {}),
      },
      orderBy: [{ kaitenChatSyncedAt: "asc" }, { id: "asc" }],
      take: take - picked.size,
      select: { id: true },
    });
    for (const r of staleRows) picked.add(r.id);
  }

  if (picked.size < take) {
    const fallbackRows = await db.order.findMany({
      where: {
        ...baseWhere,
        ...(picked.size > 0 ? { id: { notIn: [...picked] } } : {}),
      },
      orderBy: [{ kaitenChatSyncedAt: "asc" }, { id: "asc" }],
      take: take - picked.size,
      select: { id: true },
    });
    for (const r of fallbackRows) picked.add(r.id);
  }

  return [...picked];
}

/** Лёгкий импорт чата Kaiten перед чтением тостов (не чаще раза в 5 с на tenant). */
export async function maybeSyncKaitenForOrderNotificationToasts(
  db: PrismaClient,
  tenantId: string,
): Promise<{ synced: boolean; rateLimited: boolean }> {
  const tid = tenantId.trim();
  if (!tid) return { synced: false, rateLimited: false };

  const now = Date.now();
  const last = tenantToastSyncAt.get(tid) ?? 0;
  if (now - last < TOAST_KAITEN_SYNC_GAP_MS) {
    return { synced: false, rateLimited: false };
  }
  tenantToastSyncAt.set(tid, now);

  const auth = getKaitenRestAuth();
  if (!auth) return { synced: false, rateLimited: false };

  const orderIds = await pickOrderIdsForToastKaitenSync(
    db,
    tid,
    TOAST_KAITEN_SYNC_BATCH,
  );
  if (orderIds.length === 0) return { synced: false, rateLimited: false };

  const batch = await syncKaitenChatCommentsForOrderIds(db, auth, orderIds, {
    source: "list",
  });
  return {
    synced: batch.syncedCount > 0,
    rateLimited: batch.rateLimited,
  };
}

async function fetchCorrectionToastRows(
  db: PrismaClient,
): Promise<OrderNotificationToastRow[]> {
  const rows = await db.orderChatCorrection.findMany({
    where: {
      resolvedAt: null,
      rejectedAt: null,
      order: { archivedAt: null },
    },
    orderBy: { createdAt: "desc" },
    take: 32,
    select: {
      id: true,
      text: true,
      authorLabel: true,
      createdAt: true,
      order: { select: { id: true, orderNumber: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    authorLabel: r.authorLabel,
    orderId: r.order.id,
    orderNumber: r.order.orderNumber,
    createdAt: r.createdAt.toISOString(),
  }));
}

async function fetchProstheticsToastRows(
  db: PrismaClient,
): Promise<OrderNotificationToastRow[]> {
  const rows = await db.orderProstheticsRequest.findMany({
    where: {
      resolvedAt: null,
      rejectedAt: null,
      order: { archivedAt: null },
    },
    orderBy: { createdAt: "desc" },
    take: 32,
    select: {
      id: true,
      text: true,
      authorLabel: true,
      createdAt: true,
      order: { select: { id: true, orderNumber: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    authorLabel: r.authorLabel,
    orderId: r.order.id,
    orderNumber: r.order.orderNumber,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function fetchOrderNotificationToasts(
  db: PrismaClient,
  opts: {
    userId: string | null | undefined;
    includeChat: boolean;
  },
): Promise<{
  messages: OrderNotificationToastRow[];
  corrections: OrderNotificationToastRow[];
  requests: OrderNotificationToastRow[];
}> {
  const [messages, corrections, requests] = await Promise.all([
    opts.includeChat
      ? fetchOrderChatToastRows(db, opts.userId)
      : Promise.resolve([]),
    fetchCorrectionToastRows(db),
    fetchProstheticsToastRows(db),
  ]);
  return { messages, corrections, requests };
}
