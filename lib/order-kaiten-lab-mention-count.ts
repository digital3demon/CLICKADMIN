import type { Prisma, PrismaClient, UserRole } from "@prisma/client";
import { kaitenLabMentionPendingForUser } from "@/lib/order-kaiten-lab-mention-pending";
import {
  countOrdersWithPendingInboxLabMentionForUser,
  isOrderChatInboxDualReadEnabled,
  isOrderChatInboxReadNewEnabled,
  isOrderChatInboxReadNewEnabledForTenant,
} from "@/lib/order-chat-inbox-dual-read.server";
import { logger } from "@/lib/server/logger";

const LAB_MENTION_ACK_ROLES: UserRole[] = [
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
];

function tenantIdFromWhere(where: Prisma.OrderWhereInput): string | null {
  if (where && typeof where === "object" && "tenantId" in where) {
    const v = (where as { tenantId?: unknown }).tenantId;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const andParts = (where as { AND?: unknown }).AND;
  if (!Array.isArray(andParts)) return null;
  for (const part of andParts) {
    if (part && typeof part === "object" && "tenantId" in (part as object)) {
      const v = (part as { tenantId?: unknown }).tenantId;
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return null;
}

/** Сколько нарядов с непрочитанным упоминанием (прочтение общим флагом на всю лабораторию). */
export async function countOrdersWithPendingKaitenLabMentionForUser(
  db: PrismaClient,
  baseWhere: Prisma.OrderWhereInput,
  userId?: string,
): Promise<number> {
  const inboxCountPromise = countOrdersWithPendingInboxLabMentionForUser(
    db,
    baseWhere,
    userId,
  );
  const candidates = await db.order.findMany({
    where: { AND: [baseWhere, { kaitenChatHasLabMention: true }] },
    select: { id: true, kaitenLabMentionSignalAt: true },
  });
  if (candidates.length === 0) return 0;
  const ids = candidates.map((c) => c.id);
  const globalAcks = await db.orderKaitenLabMentionAck.findMany({
    where: {
      orderId: { in: ids },
      user: { role: { in: LAB_MENTION_ACK_ROLES } },
    },
    select: { orderId: true, ackAt: true },
  });
  const ackByOrder = new Map<string, Date>();
  for (const a of globalAcks) {
    const prev = ackByOrder.get(a.orderId);
    if (!prev || a.ackAt.getTime() > prev.getTime()) {
      ackByOrder.set(a.orderId, a.ackAt);
    }
  }
  const uid = String(userId || "").trim();
  if (uid) {
    const userRow = await db.user.findUnique({
      where: { id: uid },
      select: { role: true },
    });
    const canOwnAck =
      userRow?.role === "OWNER" ||
      userRow?.role === "ADMINISTRATOR" ||
      userRow?.role === "SENIOR_ADMINISTRATOR";
    if (canOwnAck) {
      const ownAcks = await db.orderKaitenLabMentionAck.findMany({
        where: {
          orderId: { in: ids },
          userId: uid,
        },
        select: { orderId: true, ackAt: true },
      });
      for (const a of ownAcks) {
        const prev = ackByOrder.get(a.orderId);
        if (!prev || a.ackAt.getTime() > prev.getTime()) {
          ackByOrder.set(a.orderId, a.ackAt);
        }
      }
    }
  }
  let n = 0;
  for (const c of candidates) {
    if (
      kaitenLabMentionPendingForUser({
        kaitenChatHasLabMention: true,
        kaitenLabMentionSignalAt: c.kaitenLabMentionSignalAt,
        ackAt: ackByOrder.get(c.id) ?? null,
      })
    ) {
      n += 1;
    }
  }
  const inboxN = await inboxCountPromise;
  const tenantId = tenantIdFromWhere(baseWhere);
  if (
    isOrderChatInboxReadNewEnabled() ||
    isOrderChatInboxReadNewEnabledForTenant(tenantId)
  ) {
    return inboxN;
  }
  if (isOrderChatInboxDualReadEnabled()) {
    try {
      if (inboxN !== n) {
        logger.warn(
          {
            channel: "chat-inbox-dual-read",
            legacyCount: n,
            inboxCount: inboxN,
            userId: userId ?? null,
          },
          "lab mention count dual-read delta",
        );
      }
    } catch (err) {
      logger.warn(
        {
          channel: "chat-inbox-dual-read",
          userId: userId ?? null,
          err,
        },
        "lab mention count dual-read failed",
      );
    }
  }
  return n;
}
