import type { OrderChatCorrectionSource, PrismaClient } from "@prisma/client";
import {
  isOrderProstheticsRequestTrigger,
  stripOrderProstheticsRequestPrefix,
} from "@/lib/order-prosthetics-request";

export async function createOrderProstheticsRequestIfNeeded(
  db: PrismaClient,
  orderId: string,
  rawMessage: string,
  source: OrderChatCorrectionSource,
  opts?: { kaitenCommentId?: number | null },
): Promise<void> {
  if (!isOrderProstheticsRequestTrigger(rawMessage)) return;
  const text = stripOrderProstheticsRequestPrefix(rawMessage);
  if (!text) return;

  const kid = opts?.kaitenCommentId ?? null;
  if (source === "KAITEN" && kid != null) {
    await db.orderProstheticsRequest.upsert({
      where: {
        orderId_kaitenCommentId: { orderId, kaitenCommentId: kid },
      },
      create: { orderId, source, text, kaitenCommentId: kid },
      update: {},
    });
    return;
  }

  await db.orderProstheticsRequest.create({
    data: { orderId, source, text, kaitenCommentId: kid },
  });
}

/**
 * Импорт «???» из списка комментариев Kaiten.
 * `text` — уже без префикса `[CRM · …]\n` (как после parseKaitenListComment).
 */
export async function syncOrderProstheticsRequestsFromKaitenComments(
  db: PrismaClient,
  orderId: string,
  comments: ReadonlyArray<{ id: number; text: string }>,
): Promise<void> {
  for (const c of comments) {
    await createOrderProstheticsRequestIfNeeded(db, orderId, c.text, "KAITEN", {
      kaitenCommentId: c.id,
    });
  }
}
