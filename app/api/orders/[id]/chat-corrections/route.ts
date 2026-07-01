import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { createOrderChatCorrectionIfNeeded } from "@/lib/order-chat-correction-db";
import { createOrderProstheticsRequestIfNeeded } from "@/lib/order-prosthetics-request-db";
import { kaitenRetryAfterSeconds } from "@/lib/kaiten-rate-limit";
import { syncOrderChatCorrectionsFromKaitenLive } from "@/lib/order-chat-correction-kaiten-sync";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";

export const dynamic = "force-dynamic";

type PostBody = { text?: string };

/**
 * Список корректировок по наряду (для быстрого подхвата после сообщения в Kaiten/канбане без полного router.refresh).
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { id: orderId } = await ctx.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  const order = await prisma.order.findFirst({
    where: { id: orderId.trim(), tenantId },
    select: { id: true, kaitenCardId: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }

  let liveRateLimited = false;
  if (order.kaitenCardId != null) {
    try {
      const live = await syncOrderChatCorrectionsFromKaitenLive(
        prisma,
        order.id,
        order.kaitenCardId,
      );
      liveRateLimited = live.rateLimited;
    } catch (e) {
      console.error("[chat-corrections GET] live Kaiten sync", e);
    }
  }

  const rows = await prisma.orderChatCorrection.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      text: true,
      source: true,
      authorLabel: true,
      createdAt: true,
      resolvedAt: true,
      rejectedAt: true,
    },
  });

  const corrections = rows.map((r) => ({
    id: r.id,
    text: r.text,
    source: r.source,
    authorLabel: r.authorLabel,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
  }));

  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (liveRateLimited) {
    headers["Retry-After"] = kaitenRetryAfterSeconds();
  }

  return NextResponse.json(
    {
      corrections,
      ...(liveRateLimited
        ? {
            rateLimited: true,
            error: "Слишком много запросов к Kaiten, повторите позже",
          }
        : {}),
    },
    { status: liveRateLimited ? 429 : 200, headers },
  );
}

/**
 * Занести корректировку из чата демо-канбана (сообщение уже в локальной ленте).
 * Для Kaiten запись создаётся в POST …/kaiten/comments.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { id: orderId } = await ctx.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const raw = typeof body.text === "string" ? body.text : "";
  const authorLabel = userActivityDisplayLabel({
    mentionHandle: null,
    displayName: session.name?.trim() || null,
    email: session.email || null,
  });

  const prisma = await getOrdersPrisma();
  const order = await prisma.order.findFirst({
    where: { id: orderId.trim(), tenantId },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }

  await createOrderChatCorrectionIfNeeded(
    prisma,
    order.id,
    raw,
    "DEMO_KANBAN",
    { authorLabel },
  );
  await createOrderProstheticsRequestIfNeeded(
    prisma,
    order.id,
    raw,
    "DEMO_KANBAN",
    { authorLabel },
  );

  return NextResponse.json({ ok: true });
}
