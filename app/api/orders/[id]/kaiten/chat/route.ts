import { NextResponse } from "next/server";
import {
  dedupeParsedKaitenComments,
  parseKaitenListComment,
} from "@/lib/kaiten-comment-parse";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getKaitenRestAuth, kaitenListComments } from "@/lib/kaiten-rest";
import { syncOrderChatCorrectionsFromKaitenComments } from "@/lib/order-chat-correction-db";
import { syncOrderProstheticsRequestsFromKaitenComments } from "@/lib/order-prosthetics-request-db";

export const dynamic = "force-dynamic";

/**
 * Только комментарии карточки Kaiten (один вызов API вместо полного снимка).
 * Для канбана и быстрых обновлений чата.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = getKaitenRestAuth();
  if (!auth) {
    return NextResponse.json({ error: "Kaiten не настроен" }, { status: 503 });
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
  if (order.kaitenCardId == null) {
    return NextResponse.json(
      { error: "К карточке Kaiten не привязано" },
      { status: 400 },
    );
  }

  const comm = await kaitenListComments(auth, order.kaitenCardId);
  if (!comm.ok) {
    return NextResponse.json(
      { error: comm.error ?? "Не удалось загрузить комментарии Kaiten" },
      { status: 502 },
    );
  }

  const comments = dedupeParsedKaitenComments(
    comm.comments
      .map(parseKaitenListComment)
      .filter((x): x is NonNullable<typeof x> => x != null),
  );
  const forSync = comments.map((c) => ({ id: c.id, text: c.text }));

  try {
    await syncOrderChatCorrectionsFromKaitenComments(prisma, order.id, forSync);
    await syncOrderProstheticsRequestsFromKaitenComments(prisma, order.id, forSync);
  } catch (e) {
    console.error("[kaiten chat GET] correction sync", e);
  }

  return NextResponse.json(
    { comments },
    { headers: { "Cache-Control": "no-store" } },
  );
}
