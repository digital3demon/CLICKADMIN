import type { OrderChatCorrectionSource, PrismaClient } from "@prisma/client";
import {
  isOrderProstheticsRequestTrigger,
  normalizeProstheticsTwinKey,
  stripOrderProstheticsRequestPrefix,
} from "@/lib/order-prosthetics-request";
import {
  type OrderChatTriggerKaitenComment,
  trimOrderChatAuthorLabel,
} from "@/lib/order-chat-trigger-author";

/** В CRM «???» всегда Канбан: Kaiten → зеркало канбана → запись DEMO_KANBAN. */
const PROSTHETICS_CRM_SOURCE: OrderChatCorrectionSource = "DEMO_KANBAN";

async function findPendingProstheticsTwinIds(
  db: PrismaClient,
  orderId: string,
  text: string,
  opts: { requireNullKid: boolean; excludeId?: string },
): Promise<string[]> {
  const key = normalizeProstheticsTwinKey(text);
  if (!key) return [];
  const rows = await db.orderProstheticsRequest.findMany({
    where: {
      orderId,
      resolvedAt: null,
      rejectedAt: null,
      ...(opts.requireNullKid ? { kaitenCommentId: null } : {}),
      ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 60,
    select: { id: true, text: true, kaitenCommentId: true },
  });
  return rows
    .filter((r) => normalizeProstheticsTwinKey(r.text) === key)
    .map((r) => r.id);
}

/**
 * Пишет заявку «???».
 * Source в БД всегда DEMO_KANBAN (подпись «Канбан» в UI), даже если текст
 * пришёл из комментария Kaiten после зеркала в канбан.
 * kaitenCommentId — только для дедупа / привязки близнеца, не меняет source.
 */
export async function createOrderProstheticsRequestIfNeeded(
  db: PrismaClient,
  orderId: string,
  rawMessage: string,
  _source: OrderChatCorrectionSource,
  opts?: { kaitenCommentId?: number | null; authorLabel?: string | null },
): Promise<void> {
  if (!isOrderProstheticsRequestTrigger(rawMessage)) return;
  const text = stripOrderProstheticsRequestPrefix(rawMessage);
  if (!text) return;

  const kid = opts?.kaitenCommentId ?? null;
  const authorLabel = trimOrderChatAuthorLabel(opts?.authorLabel);
  if (kid != null) {
    const existingByKid = await db.orderProstheticsRequest.findUnique({
      where: {
        orderId_kaitenCommentId: { orderId, kaitenCommentId: kid },
      },
      select: { id: true },
    });
    if (existingByKid) {
      await db.orderProstheticsRequest.update({
        where: { id: existingByKid.id },
        data: {
          source: PROSTHETICS_CRM_SOURCE,
          ...(authorLabel ? { authorLabel } : {}),
        },
      });
      const orphanIds = await findPendingProstheticsTwinIds(db, orderId, text, {
        requireNullKid: true,
        excludeId: existingByKid.id,
      });
      if (orphanIds.length) {
        await db.orderProstheticsRequest.deleteMany({
          where: { id: { in: orphanIds } },
        });
      }
      return;
    }

    const twinIds = await findPendingProstheticsTwinIds(db, orderId, text, {
      requireNullKid: true,
    });
    const twinId = twinIds[0];
    if (twinId) {
      await db.orderProstheticsRequest.update({
        where: { id: twinId },
        data: {
          kaitenCommentId: kid,
          source: PROSTHETICS_CRM_SOURCE,
          text,
          ...(authorLabel ? { authorLabel } : {}),
        },
      });
      if (twinIds.length > 1) {
        await db.orderProstheticsRequest.deleteMany({
          where: { id: { in: twinIds.slice(1) } },
        });
      }
      return;
    }

    await db.orderProstheticsRequest.create({
      data: {
        orderId,
        source: PROSTHETICS_CRM_SOURCE,
        text,
        kaitenCommentId: kid,
        authorLabel,
      },
    });
    return;
  }

  // Канбан без kid: не плодим дубль к уже существующему pending (в т.ч. с kid).
  const pendingSame = await db.orderProstheticsRequest.findMany({
    where: {
      orderId,
      resolvedAt: null,
      rejectedAt: null,
    },
    orderBy: { createdAt: "asc" },
    take: 60,
    select: { id: true, text: true },
  });
  const key = normalizeProstheticsTwinKey(text);
  const already =
    key &&
    pendingSame.some((r) => normalizeProstheticsTwinKey(r.text) === key);
  if (already) return;

  await db.orderProstheticsRequest.create({
    data: {
      orderId,
      source: PROSTHETICS_CRM_SOURCE,
      text,
      kaitenCommentId: null,
      authorLabel,
    },
  });
}

/**
 * Импорт «???» из комментариев Kaiten после зеркала в канбан.
 * В CRM пишется DEMO_KANBAN (не подпись «Kaiten»).
 * `text` — уже без префикса `[CRM · …]\n` (как после parseKaitenListComment).
 */
export async function syncOrderProstheticsRequestsFromKaitenComments(
  db: PrismaClient,
  orderId: string,
  comments: ReadonlyArray<OrderChatTriggerKaitenComment>,
): Promise<void> {
  for (const c of comments) {
    await createOrderProstheticsRequestIfNeeded(db, orderId, c.text, "DEMO_KANBAN", {
      kaitenCommentId: c.id,
      authorLabel: c.authorName,
    });
  }
}
