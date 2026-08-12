import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { createOrderChatCorrectionIfNeeded } from "@/lib/order-chat-correction-db";
import { createOrderProstheticsRequestIfNeeded } from "@/lib/order-prosthetics-request-db";
import { kaitenRetryAfterSeconds } from "@/lib/kaiten-rate-limit";
import { syncOrderChatCorrectionsFromKaitenLive } from "@/lib/order-chat-correction-kaiten-sync";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";
import { createOrderChatInboxItemsFromCrmComment } from "@/lib/order-chat-inbox-db";
import { fetchMergedOrderChatCorrections } from "@/lib/order-chat-corrections-read";

export const dynamic = "force-dynamic";

type PostBody = { text?: string };

function apiDraftId(): string {
  return `api_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

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
  let labMentionDbChanged = false;
  let importedCorrections = 0;
  let importedProsthetics = 0;
  if (order.kaitenCardId != null) {
    try {
      const live = await syncOrderChatCorrectionsFromKaitenLive(
        prisma,
        order.id,
        order.kaitenCardId,
        { source: "live" },
      );
      liveRateLimited = live.rateLimited;
      labMentionDbChanged = live.labMentionDbChanged;
      importedCorrections = live.importedCorrections;
      importedProsthetics = live.importedProsthetics;
    } catch (e) {
      console.error("[chat-corrections GET] live Kaiten sync", e);
    }
  }

  const merged = await fetchMergedOrderChatCorrections(prisma, order.id, {
    tenantId,
  });
  const corrections = merged.map((r) => ({
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
      labMentionDbChanged,
      importedCorrections,
      importedProsthetics,
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
    select: { id: true, tenant: { select: { kanbanAdminMentionTag: true } } },
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
  await createOrderChatInboxItemsFromCrmComment(prisma, {
    tenantId,
    orderId: order.id,
    text: raw,
    authorLabel,
    kanbanAdminMentionTag: order.tenant?.kanbanAdminMentionTag,
    crmDraftId: apiDraftId(),
    syncState: "LOCAL_ONLY",
    source: "DEMO_KANBAN",
  });

  return NextResponse.json({ ok: true });
}
