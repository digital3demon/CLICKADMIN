import type { PrismaClient } from "@prisma/client";
import { fetchOrderChatToastRows } from "@/lib/order-chat-toasts.server";
import { countOrdersWithPendingKaitenLabMentionForUser } from "@/lib/order-kaiten-lab-mention-count";

export type OrderNotificationToastRow = {
  id: string;
  text: string;
  authorLabel: string | null;
  orderId: string;
  orderNumber: string;
  createdAt: string;
};

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
  },
): Promise<{
  messages: OrderNotificationToastRow[];
  corrections: OrderNotificationToastRow[];
  requests: OrderNotificationToastRow[];
  labMentionCount: number;
}> {
  const [messages, corrections, requests, labMentionCount] = await Promise.all([
    fetchOrderChatToastRows(db, opts.userId, opts.tenantId),
    fetchCorrectionToastRows(db, opts.tenantId),
    fetchProstheticsToastRows(db, opts.tenantId),
    countOrdersWithPendingKaitenLabMentionForUser(
      db,
      { archivedAt: null, tenantId: opts.tenantId },
      opts.userId ?? undefined
    ),
  ]);
  return { messages, corrections, requests, labMentionCount };
}
