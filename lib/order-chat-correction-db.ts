import type { OrderChatCorrectionSource, PrismaClient } from "@prisma/client";
import {
  kaitenJsonIntId,
  parseKaitenListComment,
} from "@/lib/kaiten-comment-parse";
import {
  isOrderChatCorrectionTrigger,
  stripOrderChatCorrectionPrefix,
} from "@/lib/order-chat-correction";
import {
  type OrderChatTriggerKaitenComment,
  trimOrderChatAuthorLabel,
} from "@/lib/order-chat-trigger-author";

/** id комментария из ответа Kaiten REST (POST/GET). */
export function kaitenApiCommentNumericId(
  j: Record<string, unknown> | null | undefined,
): number | null {
  if (j == null) return null;
  return kaitenJsonIntId(j.id);
}

/**
 * Пишет корректировку «!!!».
 * KAITEN + kaitenCommentId: сначала привязывает pending DEMO_KANBAN-близнеца
 * (тот же текст, без kid), иначе upsert по orderId+kid — без дубля Канбан/Kaiten.
 */
export async function createOrderChatCorrectionIfNeeded(
  db: PrismaClient,
  orderId: string,
  rawMessage: string,
  source: OrderChatCorrectionSource,
  opts?: { kaitenCommentId?: number | null; authorLabel?: string | null },
): Promise<void> {
  if (!isOrderChatCorrectionTrigger(rawMessage)) return;
  const text = stripOrderChatCorrectionPrefix(rawMessage);
  if (!text) return;

  const kid = opts?.kaitenCommentId ?? null;
  const authorLabel = trimOrderChatAuthorLabel(opts?.authorLabel);
  if (source === "KAITEN" && kid != null) {
    const existingByKid = await db.orderChatCorrection.findUnique({
      where: {
        orderId_kaitenCommentId: { orderId, kaitenCommentId: kid },
      },
      select: { id: true },
    });
    if (existingByKid) {
      if (authorLabel) {
        await db.orderChatCorrection.update({
          where: { id: existingByKid.id },
          data: { authorLabel },
        });
      }
      await db.orderChatCorrection.deleteMany({
        where: {
          orderId,
          text,
          kaitenCommentId: null,
          resolvedAt: null,
          rejectedAt: null,
          id: { not: existingByKid.id },
        },
      });
      return;
    }

    const twin = await db.orderChatCorrection.findFirst({
      where: {
        orderId,
        text,
        kaitenCommentId: null,
        resolvedAt: null,
        rejectedAt: null,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (twin) {
      await db.orderChatCorrection.update({
        where: { id: twin.id },
        data: {
          kaitenCommentId: kid,
          source: "KAITEN",
          ...(authorLabel ? { authorLabel } : {}),
        },
      });
      return;
    }

    await db.orderChatCorrection.create({
      data: {
        orderId,
        source: "KAITEN",
        text,
        kaitenCommentId: kid,
        authorLabel,
      },
    });
    return;
  }

  await db.orderChatCorrection.create({
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
 * Импорт «!!!» из списка комментариев Kaiten (в т.ч. написанных в самом Kaiten).
 * `text` — уже без префикса `[CRM · …]\\n` (как после parseKaitenListComment).
 */
export async function syncOrderChatCorrectionsFromKaitenComments(
  db: PrismaClient,
  orderId: string,
  comments: ReadonlyArray<OrderChatTriggerKaitenComment>,
): Promise<void> {
  for (const c of comments) {
    await createOrderChatCorrectionIfNeeded(db, orderId, c.text, "KAITEN", {
      kaitenCommentId: c.id,
      authorLabel: c.authorName,
    });
  }
}

/** Комментарии из кэша снимка GET /kaiten (поле `comments`). */
export function kaitenCommentsForSyncFromSnapshotPayload(
  payload: Record<string, unknown>,
): OrderChatTriggerKaitenComment[] {
  const raw = payload.comments;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const out: OrderChatTriggerKaitenComment[] = [];
  for (const x of raw) {
    const parsed = parseKaitenListComment(x);
    if (parsed == null || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    out.push({
      id: parsed.id,
      text: parsed.text,
      authorName: parsed.authorName,
    });
  }
  return out;
}
