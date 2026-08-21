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

/** Варианты текста для близнеца !!! (с префиксом и без). Кириллица — обычные символы, не \\b. */
export function orderChatCorrectionTwinTexts(raw: string): string[] {
  const trimmed = String(raw || "").trim();
  const stripped =
    stripOrderChatCorrectionPrefix(trimmed)?.trim() ||
    trimmed.replace(/^\s*!!!\s*/u, "").trim();
  return [...new Set([trimmed, stripped, stripped ? `!!! ${stripped}` : ""].filter(Boolean))];
}

async function findClosedCorrectionTextTwin(
  db: PrismaClient,
  orderId: string,
  text: string,
  opts?: { excludeId?: string },
): Promise<{ id: string } | null> {
  const variants = orderChatCorrectionTwinTexts(text);
  if (!variants.length) return null;
  return db.orderChatCorrection.findFirst({
    where: {
      orderId,
      text: { in: variants },
      kaitenCommentId: null,
      OR: [{ resolvedAt: { not: null } }, { rejectedAt: { not: null } }],
      ...(opts?.excludeId ? { id: { not: opts.excludeId } } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
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
      select: { id: true, resolvedAt: true, rejectedAt: true },
    });
    if (existingByKid) {
      const pendingGhost =
        existingByKid.resolvedAt == null && existingByKid.rejectedAt == null;
      if (pendingGhost) {
        const closedTwin = await findClosedCorrectionTextTwin(db, orderId, text, {
          excludeId: existingByKid.id,
        });
        if (closedTwin) {
          await db.orderChatCorrection.delete({ where: { id: existingByKid.id } });
          await db.orderChatCorrection.update({
            where: { id: closedTwin.id },
            data: {
              kaitenCommentId: kid,
              source: "KAITEN",
              ...(authorLabel ? { authorLabel } : {}),
            },
          });
          return;
        }
      }
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

    const closedTwin = await findClosedCorrectionTextTwin(db, orderId, text);
    if (closedTwin) {
      await db.orderChatCorrection.update({
        where: { id: closedTwin.id },
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

  const closedSame = await findClosedCorrectionTextTwin(db, orderId, text);
  if (closedSame) return;

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
