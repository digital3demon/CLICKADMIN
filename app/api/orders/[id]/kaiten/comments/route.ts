import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import {
  buildKaitenCommentTextWithCrmAuthor,
  parseKaitenListComment,
} from "@/lib/kaiten-comment-parse";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { invalidateKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import {
  getKaitenRestAuth,
  kaitenCreateComment,
  kaitenListComments,
} from "@/lib/kaiten-rest";
import {
  createOrderChatCorrectionIfNeeded,
  kaitenApiCommentNumericId,
  syncOrderChatCorrectionsFromKaitenComments,
} from "@/lib/order-chat-correction-db";
import { isOrderChatCorrectionTrigger } from "@/lib/order-chat-correction";
import {
  createOrderProstheticsRequestIfNeeded,
  syncOrderProstheticsRequestsFromKaitenComments,
} from "@/lib/order-prosthetics-request-db";
import { isOrderProstheticsRequestTrigger } from "@/lib/order-prosthetics-request";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";

type PostBody = {
  text?: string;
  parentCommentId?: number | null;
};

const KAITEN_COMMENT_BODY_MAX = 8000;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: orderId } = await ctx.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const auth = getKaitenRestAuth();
  if (!auth) {
    return NextResponse.json({ error: "Kaiten не настроен" }, { status: 503 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Пустой текст" }, { status: 400 });
  }

  const session = await getSessionFromCookies();
  const label = session
    ? userActivityDisplayLabel({
        mentionHandle: null,
        displayName: session.name?.trim() || null,
        email: session.email || null,
      })
    : "Гость";
  const kaitenText = buildKaitenCommentTextWithCrmAuthor(label, text);
  if (kaitenText.length > KAITEN_COMMENT_BODY_MAX) {
    return NextResponse.json(
      {
        error: `Слишком длинное сообщение (вместе с подписью автора не более ${KAITEN_COMMENT_BODY_MAX} символов)`,
      },
      { status: 400 },
    );
  }

  const parent =
    body.parentCommentId != null && Number.isFinite(body.parentCommentId)
      ? body.parentCommentId
      : null;

  const prisma = await getOrdersPrisma();
  const order = await prisma.order.findUnique({
    where: { id: orderId.trim() },
    select: { id: true, kaitenCardId: true, orderNumber: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }
  if (order.kaitenCardId == null) {
    return NextResponse.json({ error: "Нет карточки Kaiten" }, { status: 400 });
  }

  const res = await kaitenCreateComment(auth, order.kaitenCardId, kaitenText, parent);

  if (!res.ok) {
    return NextResponse.json(
      { error: res.error ?? "Не удалось отправить комментарий" },
      { status: 502 },
    );
  }

  try {
    if (isOrderChatCorrectionTrigger(text)) {
      const kid = kaitenApiCommentNumericId(res.comment);
      if (kid != null) {
        await createOrderChatCorrectionIfNeeded(prisma, order.id, text, "KAITEN", {
          kaitenCommentId: kid,
        });
      } else {
        const list = await kaitenListComments(auth, order.kaitenCardId);
        if (list.ok) {
          const parsed = list.comments
            .map(parseKaitenListComment)
            .filter((x): x is NonNullable<typeof x> => x != null);
          const forSync = parsed.map((c) => ({ id: c.id, text: c.text }));
          await syncOrderChatCorrectionsFromKaitenComments(prisma, order.id, forSync);
          await syncOrderProstheticsRequestsFromKaitenComments(
            prisma,
            order.id,
            forSync,
          );
        } else {
          await createOrderChatCorrectionIfNeeded(prisma, order.id, text, "KAITEN");
        }
      }
    }
    if (isOrderProstheticsRequestTrigger(text)) {
      const kid = kaitenApiCommentNumericId(res.comment);
      if (kid != null) {
        await createOrderProstheticsRequestIfNeeded(prisma, order.id, text, "KAITEN", {
          kaitenCommentId: kid,
        });
      } else {
        const list = await kaitenListComments(auth, order.kaitenCardId);
        if (list.ok) {
          const parsed = list.comments
            .map(parseKaitenListComment)
            .filter((x): x is NonNullable<typeof x> => x != null);
          const forSync = parsed.map((c) => ({ id: c.id, text: c.text }));
          await syncOrderProstheticsRequestsFromKaitenComments(
            prisma,
            order.id,
            forSync,
          );
        } else {
          await createOrderProstheticsRequestIfNeeded(prisma, order.id, text, "KAITEN");
        }
      }
    }
  } catch (e) {
    console.error("[kaiten comments] correction record", e);
  }

  try {
    await prisma.order.update({
      where: { id: order.id },
      data: { kaitenSyncedAt: new Date(), kaitenSyncError: null },
    });
  } catch {
    /* ignore */
  }

  invalidateKaitenSnapshotCache(orderId.trim());

  return NextResponse.json({ ok: true, comment: res.comment });
}
