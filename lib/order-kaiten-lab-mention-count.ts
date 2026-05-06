import type { Prisma, PrismaClient, UserRole } from "@prisma/client";
import { kaitenLabMentionPendingForUser } from "@/lib/order-kaiten-lab-mention-pending";

const LAB_MENTION_ACK_ROLES: UserRole[] = [
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
];

/** Сколько нарядов с непрочитанным упоминанием (прочтение общим флагом на всю лабораторию). */
export async function countOrdersWithPendingKaitenLabMentionForUser(
  db: PrismaClient,
  baseWhere: Prisma.OrderWhereInput,
  _userId?: string,
): Promise<number> {
  const candidates = await db.order.findMany({
    where: { AND: [baseWhere, { kaitenChatHasLabMention: true }] },
    select: { id: true, kaitenLabMentionSignalAt: true },
  });
  if (candidates.length === 0) return 0;
  const ids = candidates.map((c) => c.id);
  const acks = await db.orderKaitenLabMentionAck.findMany({
    where: {
      orderId: { in: ids },
      user: { role: { in: LAB_MENTION_ACK_ROLES } },
    },
    select: { orderId: true, ackAt: true },
  });
  const ackByOrder = new Map<string, Date>();
  for (const a of acks) {
    const prev = ackByOrder.get(a.orderId);
    if (!prev || a.ackAt.getTime() > prev.getTime()) {
      ackByOrder.set(a.orderId, a.ackAt);
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
  return n;
}
