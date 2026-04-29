import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { createOrderProstheticsRequestIfNeeded } from "@/lib/order-prosthetics-request-db";
import { syncOrderChatCorrectionsFromKaitenLive } from "@/lib/order-chat-correction-kaiten-sync";
import { getPrisma } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";

type PostBody = { text?: string };

/**
 * Список заявок «???» по наряду; GET подтягивает комментарии Kaiten (как корректировки).
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

  const prisma = await getPrisma();
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
      console.error("[prosthetics-requests GET] live Kaiten sync", e);
    }
  }

  const rows = await prisma.orderProstheticsRequest.findMany({
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

  const requests = rows.map((r) => ({
    id: r.id,
    text: r.text,
    source: r.source,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
  }));

  return NextResponse.json(
    { requests },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Демо-канбан: занести «???» из локальной ленты. */
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

  const prisma = await getPrisma();
  const order = await prisma.order.findUnique({
    where: { id: orderId.trim() },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }

  await createOrderProstheticsRequestIfNeeded(
    prisma,
    order.id,
    raw,
    "DEMO_KANBAN",
  );

  return NextResponse.json({ ok: true });
}
