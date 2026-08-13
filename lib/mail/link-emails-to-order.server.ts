/**
 * Привязка писем к существующему наряду (+ опционально комментарий в Kaiten / разблокировка).
 */
import "server-only";

import type { PrismaClient } from "@prisma/client";
import { applyKaitenUnblockForOrderIfBlocked } from "@/lib/apply-kaiten-unblock-from-list-tag";
import { buildKaitenCommentTextWithCrmAuthor } from "@/lib/kaiten-comment-parse";
import {
  getKaitenRestAuth,
  kaitenCreateComment,
} from "@/lib/kaiten-rest";
import { invalidateKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import { normalizeLinkEmailIds } from "@/lib/mail/link-emails-to-order";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";

const KAITEN_COMMENT_BODY_MAX = 8000;

export type LinkEmailsToOrderResult =
  | {
      ok: true;
      linked: number;
      alreadyLinked: number;
      unblock: "done" | "skipped" | "error" | null;
      unblockError?: string;
      commentPosted: boolean;
      commentError?: string;
      orderNumber: string;
      kaitenBlockedBefore: boolean;
    }
  | { ok: false; status: number; error: string };

export async function linkEmailsToOrder(opts: {
  prisma: PrismaClient;
  tenantId: string;
  orderId: string;
  emailIds: unknown;
  comment?: string | null;
  unblock?: boolean;
  actor?: {
    name?: string | null;
    email?: string | null;
  } | null;
}): Promise<LinkEmailsToOrderResult> {
  const orderId = opts.orderId.trim();
  const emailIds = normalizeLinkEmailIds(opts.emailIds);
  if (!orderId) {
    return { ok: false, status: 400, error: "Не указан наряд" };
  }
  if (emailIds.length === 0) {
    return { ok: false, status: 400, error: "Выберите письма" };
  }

  const order = await opts.prisma.order.findFirst({
    where: { id: orderId, tenantId: opts.tenantId },
    select: {
      id: true,
      orderNumber: true,
      kaitenCardId: true,
      kaitenBlocked: true,
    },
  });
  if (!order) {
    return { ok: false, status: 404, error: "Наряд не найден" };
  }

  const emails = await opts.prisma.email.findMany({
    where: { tenantId: opts.tenantId, id: { in: emailIds } },
    select: { id: true, subject: true },
  });
  if (emails.length === 0) {
    return { ok: false, status: 404, error: "Письма не найдены" };
  }

  const existing = await opts.prisma.emailSourceOrder.findMany({
    where: {
      tenantId: opts.tenantId,
      orderId: order.id,
      emailId: { in: emails.map((e) => e.id) },
    },
    select: { emailId: true },
  });
  const already = new Set(existing.map((e) => e.emailId));
  const toLink = emails.filter((e) => !already.has(e.id));

  const hasReplyTarget = await opts.prisma.emailSourceOrder.findFirst({
    where: {
      tenantId: opts.tenantId,
      orderId: order.id,
      isReplyTarget: true,
    },
    select: { id: true },
  });

  if (toLink.length > 0) {
    await opts.prisma.emailSourceOrder.createMany({
      data: toLink.map((email, i) => ({
        tenantId: opts.tenantId,
        orderId: order.id,
        emailId: email.id,
        isReplyTarget: !hasReplyTarget && i === 0,
      })),
      skipDuplicates: true,
    });
  }

  let unblock: "done" | "skipped" | "error" | null = null;
  let unblockError: string | undefined;
  if (opts.unblock) {
    const u = await applyKaitenUnblockForOrderIfBlocked(order.id);
    if (u.kind === "done") unblock = "done";
    else if (u.kind === "skipped") unblock = "skipped";
    else {
      unblock = "error";
      unblockError = u.message;
    }
  }

  let commentPosted = false;
  let commentError: string | undefined;
  const comment = typeof opts.comment === "string" ? opts.comment.trim() : "";
  if (comment) {
    if (order.kaitenCardId == null) {
      commentError = "Нет карточки Kaiten у наряда";
    } else {
      const auth = getKaitenRestAuth();
      if (!auth) {
        commentError = "Kaiten не настроен";
      } else {
        const label = userActivityDisplayLabel({
          mentionHandle: null,
          displayName: opts.actor?.name?.trim() || null,
          email: opts.actor?.email || null,
        });
        const subjects = emails
          .map((e) => (e.subject || "").trim())
          .filter(Boolean)
          .slice(0, 5);
        const mailHint =
          subjects.length > 0
            ? `\n\nПисьма: ${subjects.join("; ")}`
            : `\n\nПривязано писем: ${emails.length}`;
        const kaitenText = buildKaitenCommentTextWithCrmAuthor(
          label,
          `${comment}${mailHint}`,
        );
        if (kaitenText.length > KAITEN_COMMENT_BODY_MAX) {
          commentError = "Слишком длинный комментарий";
        } else {
          const res = await kaitenCreateComment(
            auth,
            order.kaitenCardId,
            kaitenText,
            null,
            { burst: true },
          );
          if (!res.ok) {
            commentError = res.error ?? "Не удалось отправить комментарий";
          } else {
            commentPosted = true;
            invalidateKaitenSnapshotCache(order.id);
          }
        }
      }
    }
  }

  return {
    ok: true,
    linked: toLink.length,
    alreadyLinked: already.size,
    unblock,
    ...(unblockError ? { unblockError } : {}),
    commentPosted,
    ...(commentError ? { commentError } : {}),
    orderNumber: order.orderNumber,
    kaitenBlockedBefore: order.kaitenBlocked === true,
  };
}
