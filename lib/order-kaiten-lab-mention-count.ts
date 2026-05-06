import type { Prisma, PrismaClient } from "@prisma/client";
import { kaitenLabMentionPendingForUser } from "@/lib/order-kaiten-lab-mention-pending";

/** Сколько нарядов с учётом того, что текущий пользователь уже подтвердил просмотр (OrderKaitenLabMentionAck). */
export async function countOrdersWithPendingKaitenLabMentionForUser(
  db: PrismaClient,
  baseWhere: Prisma.OrderWhereInput,
  userId: string,
): Promise<number> {
  const candidates = await db.order.findMany({
    where: { AND: [baseWhere, { kaitenChatHasLabMention: true }] },
    select: { id: true, kaitenLabMentionSignalAt: true },
  });
  if (candidates.length === 0) return 0;
  const ids = candidates.map((c) => c.id);
  const acks = await db.orderKaitenLabMentionAck.findMany({
    where: { userId, orderId: { in: ids } },
    select: { orderId: true, ackAt: true },
  });
  const ackByOrder = new Map(acks.map((a) => [a.orderId, a.ackAt]));
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
