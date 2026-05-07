import { NextResponse } from "next/server";
import {
  dedupeParsedKaitenComments,
  parseKaitenListComment,
} from "@/lib/kaiten-comment-parse";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { getKaitenRestAuth, kaitenListComments } from "@/lib/kaiten-rest";
import { getPrisma } from "@/lib/get-prisma";
import { syncOrderChatCorrectionsFromKaitenComments } from "@/lib/order-chat-correction-db";
import { syncOrderProstheticsRequestsFromKaitenComments } from "@/lib/order-prosthetics-request-db";
import {
  findCardByLinkedOrderId,
  KANBAN_CHAT_STATE_KEY,
  parseKanbanAppState,
  upsertKaitenCommentsToCard,
} from "@/lib/kanban/chat-sync";

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
  const session = await getSessionFromCookies();
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const order = await prisma.order.findFirst({
    where: { id: orderId.trim(), tenantId },
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

  try {
    const corePrisma = await getPrisma();
    const row = await corePrisma.tenantClientState.findUnique({
      where: { tenantId_key: { tenantId, key: KANBAN_CHAT_STATE_KEY } },
      select: { value: true },
    });
    const state = parseKanbanAppState(row?.value ?? null);
    if (state) {
      const loc = findCardByLinkedOrderId(state, order.id);
      if (loc) {
        const card = state.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!;
        const merged = upsertKaitenCommentsToCard(card.comments || [], comments);
        if (merged.changed) {
          card.comments = merged.next;
          card.updatedAt = new Date().toISOString();
          await corePrisma.tenantClientState.upsert({
            where: { tenantId_key: { tenantId, key: KANBAN_CHAT_STATE_KEY } },
            create: { tenantId, key: KANBAN_CHAT_STATE_KEY, value: state as never },
            update: { value: state as never },
          });
        }
      }
    }
  } catch (e) {
    console.error("[kaiten chat GET] kanban ingest", e);
  }

  return NextResponse.json(
    { comments },
    { headers: { "Cache-Control": "no-store" } },
  );
}
