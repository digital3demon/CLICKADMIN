import { after, NextResponse } from "next/server";
import { notifyOrderRequestStatusTelegram } from "@/lib/order-request-status-telegram.server";
import { canAcceptOrderChatCorrections } from "@/lib/auth/permissions";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { buildKaitenCommentTextWithCrmAuthor } from "@/lib/kaiten-comment-parse";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { invalidateKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import { getKaitenRestAuth, kaitenCreateComment } from "@/lib/kaiten-rest";
import {
  advanceOrderProstheticsProgressPair,
  setOrderProstheticsArrivedPair,
} from "@/lib/order-chat-inbox-resolve-pair.server";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

const REPLY_TEXT = "протетика пришла";

type Body = { arrived?: boolean };

/** Тонкая обёртка: arrived=true → progress arrived; arrived=false → снять отметку. */
export async function POST(
  req: Request,
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

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }
  const arrived = body.arrived !== false;

  const prisma = await getOrdersPrisma();

  if (!arrived) {
    const closed = await setOrderProstheticsArrivedPair(
      prisma,
      orderId,
      requestId,
      false,
      session.sub,
    );
    if (!closed.ok) {
      return NextResponse.json({ error: closed.error }, { status: closed.status });
    }
    return NextResponse.json({ ok: true });
  }

  const closed = await advanceOrderProstheticsProgressPair(
    prisma,
    orderId,
    requestId,
    "arrived",
    session.sub,
  );
  if (!closed.ok) {
    return NextResponse.json({ error: closed.error }, { status: closed.status });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId.trim(), tenantId },
    select: { id: true, kaitenCardId: true, prostheticsOrdered: true },
  });
  if (!order) {
    await setOrderProstheticsArrivedPair(
      prisma,
      orderId,
      requestId,
      false,
      session.sub,
    );
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }

  if (!order.prostheticsOrdered) {
    await prisma.order.update({
      where: { id: order.id },
      data: { prostheticsOrdered: true },
    });
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
        await setOrderProstheticsArrivedPair(
          prisma,
          orderId,
          requestId,
          false,
          session.sub,
        );
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

  after(() => {
    void notifyOrderRequestStatusTelegram({
      tenantId,
      orderId,
      actorUserId: session.sub,
      kind: "prosthetics",
      status: "arrived",
    }).catch((e) => console.error("[prosthetics-requests/arrived] telegram", e));
  });
  return NextResponse.json({ ok: true });
}
