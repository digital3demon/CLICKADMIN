import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { createOrderChatCorrectionIfNeeded } from "@/lib/order-chat-correction-db";
import { createOrderProstheticsRequestIfNeeded } from "@/lib/order-prosthetics-request-db";
import { syncOrderChatCorrectionsFromKaitenLive } from "@/lib/order-chat-correction-kaiten-sync";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";

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

  const { id: orderId } = await ctx.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  const order = await prisma.order.findUnique({
    where: { id: orderId.trim() },
    select: { id: true, kaitenCardId: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }

  if (order.kaitenCardId != null) {
    try {
      await syncOrderChatCorrectionsFromKaitenLive(
        prisma,
        order.id,
        order.kaitenCardId,
      );
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
      createdAt: true,
      resolvedAt: true,
      rejectedAt: true,
    },
  });

  const corrections = rows.map((r) => ({
    id: r.id,
    text: r.text,
    source: r.source,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
  }));

  return NextResponse.json(
    { corrections },
    { headers: { "Cache-Control": "no-store" } },
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

  const prisma = await getOrdersPrisma();
  const order = await prisma.order.findUnique({
    where: { id: orderId.trim() },
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
  );
  await createOrderProstheticsRequestIfNeeded(
    prisma,
    order.id,
    raw,
    "DEMO_KANBAN",
  );

  return NextResponse.json({ ok: true });
}
