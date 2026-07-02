import type { PrismaClient } from "@prisma/client";
import { kaitenLabMentionPendingForUser } from "@/lib/order-kaiten-lab-mention-pending";

export type OrderChatToastRow = {
  id: string;
  text: string;
  authorLabel: string | null;
  orderId: string;
  orderNumber: string;
  createdAt: string;
};

const LAB_MENTION_ACK_ROLES = [
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
] as const;

/** Непрочитанные упоминания лаборатории в чате — для колонки «Чат» в тостах. */
export async function fetchOrderChatToastRows(
  db: PrismaClient,
  userId: string | null | undefined,
): Promise<OrderChatToastRow[]> {
  const candidates = await db.order.findMany({
    where: {
      archivedAt: null,
      kaitenChatHasLabMention: true,
      kaitenLabMentionSignalAt: { not: null },
    },
    orderBy: { kaitenLabMentionSignalAt: "desc" },
    take: 32,
    select: {
      id: true,
      orderNumber: true,
      kaitenLabMentionSignalAt: true,
      kaitenLabMentionToastAuthor: true,
      kaitenLabMentionToastText: true,
    },
  });
  if (candidates.length === 0) return [];

  const ids = candidates.map((c) => c.id);
  const globalAcks = await db.orderKaitenLabMentionAck.findMany({
    where: {
      orderId: { in: ids },
      user: { role: { in: [...LAB_MENTION_ACK_ROLES] } },
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
    const ownAcks = await db.orderKaitenLabMentionAck.findMany({
      where: { orderId: { in: ids }, userId: uid },
      select: { orderId: true, ackAt: true },
    });
    for (const a of ownAcks) {
      const prev = ackByOrder.get(a.orderId);
      if (!prev || a.ackAt.getTime() > prev.getTime()) {
        ackByOrder.set(a.orderId, a.ackAt);
      }
    }
  }

  const out: OrderChatToastRow[] = [];
  for (const c of candidates) {
    const signalAt = c.kaitenLabMentionSignalAt;
    if (!signalAt) continue;
    if (
      !kaitenLabMentionPendingForUser({
        kaitenChatHasLabMention: true,
        kaitenLabMentionSignalAt: signalAt,
        ackAt: ackByOrder.get(c.id) ?? null,
      })
    ) {
      continue;
    }
    out.push({
      id: `${c.id}:${signalAt.getTime()}`,
      text: c.kaitenLabMentionToastText?.trim() || "Упоминание в чате",
      authorLabel: c.kaitenLabMentionToastAuthor?.trim() || null,
      orderId: c.id,
      orderNumber: c.orderNumber,
      createdAt: signalAt.toISOString(),
    });
  }
  return out.slice(0, 8);
}
