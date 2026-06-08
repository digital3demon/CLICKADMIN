import type { PrismaClient, UserRole } from "@prisma/client";
import { kaitenLabMentionPendingForUser } from "@/lib/order-kaiten-lab-mention-pending";

const LAB_MENTION_ACK_ROLES: UserRole[] = [
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
];

export type OrderKaitenLabMentionFields = {
  id: string;
  kaitenChatHasLabMention: boolean;
  kaitenLabMentionSignalAt: Date | null;
};

/** Подсветка чата в списках: учитывает ack админов и текущего пользователя. */
export async function hydrateOrderKaitenLabMentionHighlight<
  T extends OrderKaitenLabMentionFields,
>(
  db: PrismaClient,
  userId: string | null | undefined,
  rows: T[],
): Promise<(T & { listKaitenLabMentionHighlight: boolean })[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const globalAcks = await db.orderKaitenLabMentionAck.findMany({
    where: {
      orderId: { in: ids },
      user: { role: { in: LAB_MENTION_ACK_ROLES } },
    },
    select: { orderId: true, ackAt: true },
  });
  const ackMap = new Map<string, Date>();
  for (const a of globalAcks) {
    const prev = ackMap.get(a.orderId);
    if (!prev || a.ackAt.getTime() > prev.getTime()) {
      ackMap.set(a.orderId, a.ackAt);
    }
  }
  const uid = String(userId || "").trim();
  if (uid) {
    const ownAcks = await db.orderKaitenLabMentionAck.findMany({
      where: { orderId: { in: ids }, userId: uid },
      select: { orderId: true, ackAt: true },
    });
    for (const a of ownAcks) {
      const prev = ackMap.get(a.orderId);
      if (!prev || a.ackAt.getTime() > prev.getTime()) {
        ackMap.set(a.orderId, a.ackAt);
      }
    }
  }
  return rows.map((r) => ({
    ...r,
    listKaitenLabMentionHighlight: kaitenLabMentionPendingForUser({
      kaitenChatHasLabMention: r.kaitenChatHasLabMention,
      kaitenLabMentionSignalAt: r.kaitenLabMentionSignalAt ?? null,
      ackAt: ackMap.get(r.id) ?? null,
    }),
  }));
}
