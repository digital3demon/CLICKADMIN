import { NextResponse } from "next/server";
import { canAcceptOrderChatCorrections } from "@/lib/auth/permissions";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { buildKaitenCommentTextWithCrmAuthor } from "@/lib/kaiten-comment-parse";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { invalidateKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import { getKaitenRestAuth, kaitenCreateComment } from "@/lib/kaiten-rest";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";

const REPLY_TEXT = "корректировка занесена";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; correctionId: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (!canAcceptOrderChatCorrections(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const { id: orderId, correctionId } = await ctx.params;
  if (!orderId?.trim() || !correctionId?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  const row = await prisma.orderChatCorrection.findFirst({
    where: {
      id: correctionId.trim(),
      orderId: orderId.trim(),
    },
    select: { id: true, resolvedAt: true, rejectedAt: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
  }
  if (row.resolvedAt != null) {
    return NextResponse.json({ error: "Уже принято" }, { status: 409 });
  }
  if (row.rejectedAt != null) {
    return NextResponse.json({ error: "Корректировка отклонена" }, { status: 409 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId.trim() },
    select: { id: true, kaitenCardId: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }

  await prisma.orderChatCorrection.update({
    where: { id: row.id },
    data: {
      resolvedAt: new Date(),
      resolvedByUserId: session.sub,
    },
  });

  if (order.kaitenCardId != null) {
    const auth = getKaitenRestAuth();
    if (auth) {
      const label = userActivityDisplayLabel({
        mentionHandle: null,
        displayName: session.name?.trim() || null,
        email: session.email || null,
      });
      const kaitenText = buildKaitenCommentTextWithCrmAuthor(label, REPLY_TEXT);
      const res = await kaitenCreateComment(
        auth,
        order.kaitenCardId,
        kaitenText,
        null,
      );
      if (!res.ok) {
        await prisma.orderChatCorrection.update({
          where: { id: row.id },
          data: { resolvedAt: null, resolvedByUserId: null },
        });
        return NextResponse.json(
          { error: res.error ?? "Не удалось отправить ответ в Kaiten" },
          { status: 502 },
        );
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
    }
  }

  return NextResponse.json({ ok: true });
}
