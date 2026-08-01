import type { PrismaClient } from "@prisma/client";
import { fetchOrderChatToastRows } from "@/lib/order-chat-toasts.server";
import { countOrdersWithPendingKaitenLabMentionForUser } from "@/lib/order-kaiten-lab-mention-count";
import {
  countOrdersWithPendingInboxLabMentionForUser,
  fetchInboxLabMentionToastRows,
  isOrderChatInboxDualReadEnabled,
  isOrderChatInboxReadNewEnabledForTenant,
} from "@/lib/order-chat-inbox-dual-read.server";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { logger } from "@/lib/server/logger";

export type OrderNotificationToastRow = {
  id: string;
  text: string;
  authorLabel: string | null;
  orderId: string;
  orderNumber: string;
  patientName: string | null;
  doctorName: string | null;
  createdAt: string;
};

function orderToastNames(order: {
  patientName: string | null;
  doctor: { fullName: string };
}): { patientName: string | null; doctorName: string | null } {
  return {
    patientName: order.patientName
      ? personNameSurnameInitials(order.patientName)
      : null,
    doctorName: personNameSurnameInitials(order.doctor.fullName) || null,
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
    take: 64,
    select: {
      id: true,
      text: true,
      source: true,
      authorLabel: true,
      createdAt: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          patientName: true,
          doctor: { select: { fullName: true } },
        },
      },
    },
  });
  const byKey = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const key = `${r.order.id}\0${r.text.trim().toLowerCase()}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, r);
      continue;
    }
    if (prev.source !== "KAITEN" && r.source === "KAITEN") {
      byKey.set(key, r);
    }
  }
  return [...byKey.values()]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 32)
    .map((r) => ({
      id: r.id,
      text: r.text,
      authorLabel: r.authorLabel,
      orderId: r.order.id,
      orderNumber: r.order.orderNumber,
      ...orderToastNames(r.order),
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
      order: {
        select: {
          id: true,
          orderNumber: true,
          patientName: true,
          doctor: { select: { fullName: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    authorLabel: r.authorLabel,
    orderId: r.order.id,
    orderNumber: r.order.orderNumber,
    ...orderToastNames(r.order),
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
      order: {
        select: {
          id: true,
          orderNumber: true,
          patientName: true,
          doctor: { select: { fullName: true } },
        },
      },
    },
  });
  return (rows as Array<{
    id: string;
    text: string;
    authorLabel: string | null;
    createdAt: Date;
    order: {
      id: string;
      orderNumber: string;
      patientName: string | null;
      doctor: { fullName: string };
    };
  }>).map((r) => ({
    id: r.id,
    text: r.text,
    authorLabel: r.authorLabel,
    orderId: r.order.id,
    orderNumber: r.order.orderNumber,
    ...orderToastNames(r.order),
    createdAt: r.createdAt.toISOString(),
  }));
}

function rowIds(rows: Array<{ id: string }>): string {
  return rows.map((r) => r.id).sort().join(",");
}

export async function fetchPersonalMentionToastRows(
  db: PrismaClient,
  tenantId: string,
  userId: string,
): Promise<OrderNotificationToastRow[]> {
  const tid = tenantId.trim();
  const uid = userId.trim();
  if (!uid) return [];
  const rows = await (db as any).orderChatInboxItem.findMany({
    where: {
      type: "USER_MENTION",
      targetUserId: uid,
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
      order: {
        select: {
          id: true,
          orderNumber: true,
          patientName: true,
          doctor: { select: { fullName: true } },
        },
      },
    },
  });
  return (rows as Array<{
    id: string;
    text: string;
    authorLabel: string | null;
    createdAt: Date;
    order: {
      id: string;
      orderNumber: string;
      patientName: string | null;
      doctor: { fullName: string };
    };
  }>).map((r) => ({
    id: r.id,
    text: r.text,
    authorLabel: r.authorLabel,
    orderId: r.order.id,
    orderNumber: r.order.orderNumber,
    ...orderToastNames(r.order),
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function fetchOrderNotificationToasts(
  db: PrismaClient,
  opts: {
    tenantId: string;
    userId: string | null | undefined;
    adminNotificationsAllowed?: boolean;
    correctionsNotificationsAllowed?: boolean;
    prostheticsNotificationsAllowed?: boolean;
    personalOnlyPref?: boolean;
  },
): Promise<{
  messages: OrderNotificationToastRow[];
  corrections: OrderNotificationToastRow[];
  requests: OrderNotificationToastRow[];
  personal: OrderNotificationToastRow[];
  labMentionCount: number;
}> {
  const personalOnly = opts.personalOnlyPref === true;
  const showAdmin =
    !personalOnly && opts.adminNotificationsAllowed === true;
  const showCorrections =
    !personalOnly && opts.correctionsNotificationsAllowed === true;
  const showProsthetics =
    !personalOnly && opts.prostheticsNotificationsAllowed === true;
  const uid = opts.userId ?? "";

  const personalPromise = uid
    ? fetchPersonalMentionToastRows(db, opts.tenantId, uid)
    : Promise.resolve([] as OrderNotificationToastRow[]);

  if (!showAdmin && !showCorrections && !showProsthetics) {
    const personal = await personalPromise;
    return {
      messages: [],
      corrections: [],
      requests: [],
      personal,
      labMentionCount: 0,
    };
  }

  const emptyRows = Promise.resolve([] as OrderNotificationToastRow[]);
  const [messages, corrections, requests, labMentionCount, personal] =
    await Promise.all([
      showAdmin
        ? fetchOrderChatToastRows(db, opts.userId, opts.tenantId)
        : emptyRows,
      showCorrections
        ? fetchCorrectionToastRows(db, opts.tenantId)
        : emptyRows,
      showProsthetics
        ? fetchProstheticsToastRows(db, opts.tenantId)
        : emptyRows,
      showAdmin
        ? countOrdersWithPendingKaitenLabMentionForUser(
            db,
            { archivedAt: null, tenantId: opts.tenantId },
            opts.userId ?? undefined,
          )
        : Promise.resolve(0),
      personalPromise,
    ]);

  const readNewEnabled = isOrderChatInboxReadNewEnabledForTenant(opts.tenantId);
  const dualReadEnabled = isOrderChatInboxDualReadEnabled();
  const needInboxRead = readNewEnabled || dualReadEnabled;
  let newMessages: OrderNotificationToastRow[] = [];
  let newCorrections: OrderNotificationToastRow[] = [];
  let newRequests: OrderNotificationToastRow[] = [];
  let newLabMentionCount = 0;
  if (needInboxRead) {
    [newMessages, newCorrections, newRequests, newLabMentionCount] =
      await Promise.all([
        showAdmin
          ? fetchInboxLabMentionToastRows(db, opts.userId, opts.tenantId)
          : emptyRows,
        showCorrections
          ? fetchInboxTypeToastRows(db, opts.tenantId, "CORRECTION")
          : emptyRows,
        showProsthetics
          ? fetchInboxTypeToastRows(db, opts.tenantId, "PROSTHETICS")
          : emptyRows,
        showAdmin
          ? countOrdersWithPendingInboxLabMentionForUser(
              db,
              { archivedAt: null, tenantId: opts.tenantId },
              opts.userId ?? undefined,
            )
          : Promise.resolve(0),
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
      if (
        delta.messages ||
        delta.corrections ||
        delta.requests ||
        delta.labMentionCount
      ) {
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
      personal,
      labMentionCount: newLabMentionCount,
    };
  }

  return { messages, corrections, requests, personal, labMentionCount };
}
