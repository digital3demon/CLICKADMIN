import { NextResponse } from "next/server";
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
import type { ProstheticsProgressStep } from "@/lib/prosthetics-in-transit-step";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

const REPLY_TEXT = "протетика пришла";

type Body = { step?: string };

function parseStep(raw: unknown): ProstheticsProgressStep | null {
  if (raw === "arrived" || raw === "checked" || raw === "completed") {
    return raw;
  }
  return null;
}

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
  const step = parseStep(body.step);
  if (!step) {
    return NextResponse.json(
      { error: "Укажите step: arrived | checked | completed" },
      { status: 400 },
    );
  }

  const prisma = await getOrdersPrisma();
  const advanced = await advanceOrderProstheticsProgressPair(
    prisma,
    orderId,
    requestId,
    step,
    session.sub,
  );
  if (!advanced.ok) {
    return NextResponse.json(
      { error: advanced.error },
      { status: advanced.status },
    );
  }

  if (step !== "arrived") {
    return NextResponse.json({ ok: true, step });
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

  /* Приход = протетика уже заказана/получена — отмечаем галочку на наряде. */
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

  return NextResponse.json({ ok: true, step });
}
