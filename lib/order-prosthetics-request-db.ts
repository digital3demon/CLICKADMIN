import type { OrderChatCorrectionSource, PrismaClient } from "@prisma/client";
import {
  isOrderProstheticsRequestTrigger,
  stripOrderProstheticsRequestPrefix,
} from "@/lib/order-prosthetics-request";
import {
  type OrderChatTriggerKaitenComment,
  trimOrderChatAuthorLabel,
} from "@/lib/order-chat-trigger-author";

export async function createOrderProstheticsRequestIfNeeded(
  db: PrismaClient,
  orderId: string,
  rawMessage: string,
  source: OrderChatCorrectionSource,
  opts?: { kaitenCommentId?: number | null; authorLabel?: string | null },
): Promise<void> {
  if (!isOrderProstheticsRequestTrigger(rawMessage)) return;
  const text = stripOrderProstheticsRequestPrefix(rawMessage);
  if (!text) return;

  const kid = opts?.kaitenCommentId ?? null;
  const authorLabel = trimOrderChatAuthorLabel(opts?.authorLabel);
  if (source === "KAITEN" && kid != null) {
    await db.orderProstheticsRequest.upsert({
      where: {
        orderId_kaitenCommentId: { orderId, kaitenCommentId: kid },
      },
      create: {
        orderId,
        source,
        text,
        kaitenCommentId: kid,
        authorLabel,
      },
      update: authorLabel ? { authorLabel } : {},
    });
    return;
  }

  await db.orderProstheticsRequest.create({
    data: {
      orderId,
      source,
      text,
      kaitenCommentId: kid,
      authorLabel,
    },
  });
}

/**
 * Импорт «???» из списка комментариев Kaiten.
 * `text` — уже без префикса `[CRM · …]\n` (как после parseKaitenListComment).
 */
export async function syncOrderProstheticsRequestsFromKaitenComments(
  db: PrismaClient,
  orderId: string,
  comments: ReadonlyArray<OrderChatTriggerKaitenComment>,
): Promise<void> {
  for (const c of comments) {
    await createOrderProstheticsRequestIfNeeded(db, orderId, c.text, "KAITEN", {
      kaitenCommentId: c.id,
      authorLabel: c.authorName,
    });
  }
}
