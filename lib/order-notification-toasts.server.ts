import type { PrismaClient } from "@prisma/client";
import { fetchOrderChatToastRows } from "@/lib/order-chat-toasts.server";
import { countOrdersWithPendingKaitenLabMentionForUser } from "@/lib/order-kaiten-lab-mention-count";
import {
  countOrdersWithPendingInboxLabMentionForUser,
  fetchInboxLabMentionToastRows,
  isOrderChatInboxDualReadEnabled,
  isOrderChatInboxReadNewEnabledForTenant,
} from "@/lib/order-chat-inbox-dual-read.server";
import { logger } from "@/lib/server/logger";

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

async function fetchInboxTypeToastRows(
  db: PrismaClient,
  tenantId: string,
  type: "CORRECTION" | "PROSTHETICS",
): Promise<OrderNotificationToastRow[]> {
  const tid = tenantId.trim();
  const rows = await (db as any).orderChatInboxItem.findMany({
    where: {
      type,
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
  return (rows as Array<{
    id: string;
    text: string;
    authorLabel: string | null;
    createdAt: Date;
    order: { id: string; orderNumber: string };
  }>).map((r) => ({
    id: r.id,
    text: r.text,
    authorLabel: r.authorLabel,
    orderId: r.order.id,
    orderNumber: r.order.orderNumber,
    createdAt: r.createdAt.toISOString(),
  }));
}

function rowIds(rows: Array<{ id: string }>): string {
  return rows.map((r) => r.id).sort().join(",");
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

  const readNewEnabled = isOrderChatInboxReadNewEnabledForTenant(opts.tenantId);
  const dualReadEnabled = isOrderChatInboxDualReadEnabled();
  const needInboxRead = readNewEnabled || dualReadEnabled;
  let newMessages: OrderNotificationToastRow[] = [];
  let newCorrections: OrderNotificationToastRow[] = [];
  let newRequests: OrderNotificationToastRow[] = [];
  let newLabMentionCount = 0;
  if (needInboxRead) {
    [newMessages, newCorrections, newRequests, newLabMentionCount] = await Promise.all([
      fetchInboxLabMentionToastRows(db, opts.userId, opts.tenantId),
      fetchInboxTypeToastRows(db, opts.tenantId, "CORRECTION"),
      fetchInboxTypeToastRows(db, opts.tenantId, "PROSTHETICS"),
      countOrdersWithPendingInboxLabMentionForUser(
        db,
        { archivedAt: null, tenantId: opts.tenantId },
        opts.userId ?? undefined,
      ),
    ]);
  }

  if (dualReadEnabled) {
    try {
      const delta = {
        messages: rowIds(messages) === rowIds(newMessages) ? 0 : 1,
        corrections: rowIds(corrections) === rowIds(newCorrections) ? 0 : 1,
        requests: rowIds(requests) === rowIds(newRequests) ? 0 : 1,
        labMentionCount: Math.abs(labMentionCount - newLabMentionCount),
      };
      if (delta.messages || delta.corrections || delta.requests || delta.labMentionCount) {
        logger.warn(
          {
            channel: "chat-inbox-dual-read",
            tenantId: opts.tenantId,
            userId: opts.userId ?? null,
            delta,
            legacy: {
              messages: messages.length,
              corrections: corrections.length,
              requests: requests.length,
              labMentionCount,
            },
            inbox: {
              messages: newMessages.length,
              corrections: newCorrections.length,
              requests: newRequests.length,
              labMentionCount: newLabMentionCount,
            },
          },
          "order notifications dual-read delta",
        );
      }
    } catch (err) {
      logger.warn(
        {
          channel: "chat-inbox-dual-read",
          tenantId: opts.tenantId,
          userId: opts.userId ?? null,
          err,
        },
        "order notifications dual-read failed",
      );
    }
  }

  if (readNewEnabled) {
    return {
      messages: newMessages,
      corrections: newCorrections,
      requests: newRequests,
      labMentionCount: newLabMentionCount,
    };
  }

  return { messages, corrections, requests, labMentionCount };
}
