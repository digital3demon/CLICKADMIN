import { NextResponse } from "next/server";
import { canAcceptOrderChatCorrections } from "@/lib/auth/permissions";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { buildKaitenCommentTextWithCrmAuthor } from "@/lib/kaiten-comment-parse";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { invalidateKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import { getKaitenRestAuth, kaitenCreateComment } from "@/lib/kaiten-rest";
import {
  closeOrderProstheticsRequestPair,
  reopenOrderProstheticsRequestPair,
} from "@/lib/order-chat-inbox-resolve-pair.server";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

const REPLY_TEXT = "протетика в пути";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; requestId: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (!canAcceptOrderChatCorrections(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { id: orderId, requestId } = await ctx.params;
  if (!orderId?.trim() || !requestId?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  const closed = await closeOrderProstheticsRequestPair(
    prisma,
    orderId,
    requestId,
    "accept",
    session.sub,
  );
  if (!closed.ok) {
    return NextResponse.json({ error: closed.error }, { status: closed.status });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId.trim(), tenantId },
    select: { id: true, kaitenCardId: true },
  });
  if (!order) {
    await reopenOrderProstheticsRequestPair(prisma, closed, "accept");
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }

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
        { burst: true },
      );
      if (!res.ok) {
        await reopenOrderProstheticsRequestPair(prisma, closed, "accept");
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
