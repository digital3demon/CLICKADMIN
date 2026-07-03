import type { PrismaClient } from "@prisma/client";
import { getKaitenRestAuth } from "@/lib/kaiten-rest";
import {
  maybeRunActiveInboundKaitenSync,
} from "@/lib/kaiten-inbound-active-sync";
import { syncKaitenChatCommentsForOrderIds } from "@/lib/order-chat-correction-kaiten-sync";
import { fetchOrderChatToastRows } from "@/lib/order-chat-toasts.server";

export type OrderNotificationToastRow = {
  id: string;
  text: string;
  authorLabel: string | null;
  orderId: string;
  orderNumber: string;
  createdAt: string;
};

/** Лёгкий импорт чата Kaiten перед чтением тостов (с backpressure и durable throttle). */
export async function maybeSyncKaitenForOrderNotificationToasts(
  db: PrismaClient,
  tenantId: string,
): Promise<{ synced: boolean; rateLimited: boolean; skippedReason?: string | null }> {
  const auth = getKaitenRestAuth();
  if (!auth) {
    return { synced: false, rateLimited: false, skippedReason: "no_auth" };
  }

  const result = await maybeRunActiveInboundKaitenSync(
    db,
    tenantId,
    "toast",
    async (orderIds) => {
      const batch = await syncKaitenChatCommentsForOrderIds(db, auth, orderIds, {
        source: "list",
      });
      return { rateLimited: batch.rateLimited };
    },
  );

  return {
    synced: result.ran && result.syncedOrderCount > 0,
    rateLimited: result.rateLimited,
    skippedReason: result.skippedReason,
  };
}

async function fetchCorrectionToastRows(
  db: PrismaClient,
  tenantId: string,
): Promise<OrderNotificationToastRow[]> {
  const tid = tenantId.trim();
  const rows = await db.orderChatCorrection.findMany({
    where: {
      resolvedAt: null,
      rejectedAt: null,
      order: {
        archivedAt: null,
        ...(tid ? { tenantId: tid } : {}),
      },
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
  tenantId: string,
): Promise<OrderNotificationToastRow[]> {
  const tid = tenantId.trim();
  const rows = await db.orderProstheticsRequest.findMany({
    where: {
      resolvedAt: null,
      rejectedAt: null,
      order: {
        archivedAt: null,
        ...(tid ? { tenantId: tid } : {}),
      },
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
    tenantId: string;
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
      ? fetchOrderChatToastRows(db, opts.userId, opts.tenantId)
      : Promise.resolve([]),
    fetchCorrectionToastRows(db, opts.tenantId),
    fetchProstheticsToastRows(db, opts.tenantId),
  ]);
  return { messages, corrections, requests };
}
