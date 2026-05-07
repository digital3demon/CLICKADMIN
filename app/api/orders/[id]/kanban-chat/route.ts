import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import type { CardComment, KanbanAppState } from "@/lib/kanban/types";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";
import {
  buildKaitenCommentTextWithCrmAuthor,
  dedupeParsedKaitenComments,
  kaitenJsonIntId,
  parseKaitenListComment,
} from "@/lib/kaiten-comment-parse";
import { getKaitenRestAuth, kaitenCreateComment, kaitenListComments } from "@/lib/kaiten-rest";
import { createOrderChatCorrectionIfNeeded } from "@/lib/order-chat-correction-db";
import { createOrderProstheticsRequestIfNeeded } from "@/lib/order-prosthetics-request-db";
import { upsertKaitenCommentsToCard } from "@/lib/kanban/chat-sync";

const KANBAN_STATE_KEY = "kanbanAppStateV3";

type ChatAction = "comment" | "correction" | "prosthetics";

type PostBody = {
  text?: string;
  parentId?: string | null;
  action?: ChatAction;
  retryCommentId?: string | null;
};

type CardLocation = {
  boardIndex: number;
  columnIndex: number;
  cardIndex: number;
};

function nowIso(): string {
  return new Date().toISOString();
}

function newCommentId(): string {
  return `cm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSyncStatus(v: unknown): CardComment["syncStatus"] {
  if (
    v === "pending" ||
    v === "synced" ||
    v === "failed" ||
    v === "retried" ||
    v === "local"
  ) {
    return v;
  }
  return "local";
}

async function syncCrmCommentToKaiten(
  card: { kaitenCardId?: number | null; comments?: CardComment[] },
  row: CardComment,
): Promise<CardComment> {
  const next = normalizeCardComment(row);
  if (card.kaitenCardId == null || !Number.isFinite(card.kaitenCardId)) {
    next.syncStatus = "local";
    return next;
  }
  const auth = getKaitenRestAuth();
  if (!auth) {
    next.syncStatus = "failed";
    return next;
  }
  const parentExternalId = next.externalParentId
    ? kaitenJsonIntId(next.externalParentId)
    : null;
  const posted = await kaitenCreateComment(
    auth,
    card.kaitenCardId,
    buildKaitenCommentTextWithCrmAuthor(next.authorLabel || "CRM", next.text),
    parentExternalId,
  );
  if (!posted.ok) {
    next.syncStatus = "failed";
    return next;
  }
  const externalId = kaitenJsonIntId(posted.comment?.id);
  next.syncStatus = "synced";
  next.syncedAt = nowIso();
  next.externalCommentId = externalId != null ? String(externalId) : next.externalCommentId ?? null;
  return next;
}

function normalizeCardComment(row: CardComment): CardComment {
  return {
    ...row,
    parentId: row.parentId ?? null,
    externalCommentId: row.externalCommentId ?? null,
    externalParentId: row.externalParentId ?? null,
    source: row.source === "KAITEN" ? "KAITEN" : "CRM",
    syncStatus: normalizeSyncStatus(row.syncStatus),
    syncedAt: row.syncedAt ?? null,
  };
}

function parseKanbanAppState(raw: unknown): KanbanAppState | null {
  if (!raw || typeof raw !== "object") return null;
  const state = raw as Partial<KanbanAppState>;
  if (!Array.isArray(state.boards)) return null;
  if (typeof state.activeBoardId !== "string") return null;
  return state as KanbanAppState;
}

function findCardByLinkedOrderId(state: KanbanAppState, orderId: string): CardLocation | null {
  for (let bi = 0; bi < state.boards.length; bi += 1) {
    const board = state.boards[bi]!;
    for (let ci = 0; ci < board.columns.length; ci += 1) {
      const col = board.columns[ci]!;
      for (let i = 0; i < col.cards.length; i += 1) {
        const card = col.cards[i]!;
        if (String(card.linkedOrderId || "").trim() !== orderId) continue;
        return { boardIndex: bi, columnIndex: ci, cardIndex: i };
      }
    }
  }
  return null;
}

function normalizeCardCommentsForApi(list: CardComment[]): CardComment[] {
  return (list || [])
    .map((row) => normalizeCardComment(row))
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
}

async function loadTenantKanbanState(tenantId: string): Promise<{
  state: KanbanAppState | null;
  updatedAt: Date | null;
}> {
  const prisma = await getPrisma();
  const row = await prisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: KANBAN_STATE_KEY } },
    select: { value: true, updatedAt: true },
  });
  return {
    state: parseKanbanAppState(row?.value ?? null),
    updatedAt: row?.updatedAt ?? null,
  };
}

async function saveTenantKanbanStateWithRetry(
  tenantId: string,
  nextState: KanbanAppState,
  baseUpdatedAt: Date | null,
): Promise<boolean> {
  const prisma = await getPrisma();
  if (!baseUpdatedAt) {
    await prisma.tenantClientState.upsert({
      where: { tenantId_key: { tenantId, key: KANBAN_STATE_KEY } },
      create: { tenantId, key: KANBAN_STATE_KEY, value: nextState as never },
      update: { value: nextState as never },
    });
    return true;
  }
  const updated = await prisma.tenantClientState.updateMany({
    where: {
      tenantId,
      key: KANBAN_STATE_KEY,
      updatedAt: baseUpdatedAt,
    },
    data: { value: nextState as never },
  });
  return updated.count > 0;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const orderId = String(id || "").trim();
  if (!orderId) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }
  const statePayload = await loadTenantKanbanState(tenantId);
  const state = statePayload.state;
  if (!state) {
    return NextResponse.json({
      ok: true,
      mode: "kanban",
      hasCard: false,
      comments: [],
      cardImages: [],
    });
  }
  const loc = findCardByLinkedOrderId(state, orderId);
  if (!loc) {
    return NextResponse.json({
      ok: true,
      mode: "kanban",
      hasCard: false,
      comments: [],
      cardImages: [],
    });
  }
  const card = state.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!;
  const linkedKaiten = card.kaitenCardId != null && Number.isFinite(card.kaitenCardId);
  if (linkedKaiten) {
    const auth = getKaitenRestAuth();
    if (auth) {
      const list = await kaitenListComments(auth, card.kaitenCardId as number);
      if (list.ok) {
        const parsed = dedupeParsedKaitenComments(
          list.comments.map(parseKaitenListComment).filter((x): x is NonNullable<typeof x> => x != null),
        );
        const merged = upsertKaitenCommentsToCard(
          card.comments || [],
          parsed.map((c) => ({
            id: c.id,
            text: c.text,
            created: c.created,
            authorName: c.authorName,
            parentId: c.parentId,
          })),
        );
        if (merged.changed) {
          card.comments = merged.next;
          card.updatedAt = nowIso();
          await saveTenantKanbanStateWithRetry(tenantId, state, statePayload.updatedAt);
        }
      }
    }
  }
  const comments = normalizeCardCommentsForApi(card.comments || []);
  const cardImages = (card.files || [])
    .filter((f) => String(f.mime || "").toLowerCase().startsWith("image/"))
    .map((f) => ({
      id: f.id,
      name: f.name,
      url: f.dataUrl,
      mime: f.mime ?? null,
    }));
  return NextResponse.json({
    ok: true,
    mode: "kanban",
    hasCard: true,
    comments,
    cardImages,
    boardId: state.boards[loc.boardIndex]!.id,
    cardId: card.id,
    linkedKaiten,
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const orderId = String(id || "").trim();
  if (!orderId) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const action: ChatAction = body.action === "correction" || body.action === "prosthetics"
    ? body.action
    : "comment";
  const retryCommentId = String(body.retryCommentId || "").trim() || null;
  const text = String(body.text || "").trim();
  if (!retryCommentId && !text) {
    return NextResponse.json({ error: "Пустой текст" }, { status: 400 });
  }

  const ordersPrisma = await getOrdersPrisma();
  const order = await ordersPrisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: { id: true, kaitenCardId: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const loaded = await loadTenantKanbanState(tenantId);
    const state = loaded.state;
    if (!state) {
      return NextResponse.json({ error: "Канбан не инициализирован" }, { status: 404 });
    }
    const loc = findCardByLinkedOrderId(state, orderId);
    if (!loc) {
      return NextResponse.json({ error: "Карточка канбана не найдена" }, { status: 404 });
    }
    const next = structuredClone(state);
    const card =
      next.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!;
    if (retryCommentId) {
      const existingIndex = (card.comments || []).findIndex(
        (c) => String(c.id || "").trim() === retryCommentId,
      );
      if (existingIndex < 0) {
        return NextResponse.json({ error: "Комментарий для повтора не найден" }, { status: 404 });
      }
      const existing = normalizeCardComment(card.comments![existingIndex]!);
      if (existing.source !== "CRM") {
        return NextResponse.json({ error: "Можно повторить только CRM-комментарий" }, { status: 400 });
      }
      existing.syncStatus = "retried";
      const synced = await syncCrmCommentToKaiten(card, existing);
      card.comments![existingIndex] = synced;
      card.updatedAt = nowIso();
      const saved = await saveTenantKanbanStateWithRetry(tenantId, next, loaded.updatedAt);
      if (!saved) continue;
      return NextResponse.json({ ok: true, comment: synced });
    }
    const authorLabel = userActivityDisplayLabel({
      mentionHandle: null,
      displayName: session.name?.trim() || null,
      email: session.email || null,
    });
    const parentId = String(body.parentId || "").trim() || null;
    const parent = parentId
      ? (card.comments || []).find((c) => String(c.id || "").trim() === parentId)
      : null;
    const createdAt = nowIso();
    const commentId = newCommentId();
    const localComment: CardComment = normalizeCardComment({
      id: commentId,
      userId: session.sub,
      text,
      createdAt,
      parentId,
      authorLabel,
      source: "CRM",
      syncStatus:
        card.kaitenCardId != null && Number.isFinite(card.kaitenCardId) ? "pending" : "local",
      syncedAt: null,
      externalCommentId: null,
      externalParentId: parent?.externalCommentId ?? null,
    });
    card.comments = [...(card.comments || []), localComment];
    card.updatedAt = createdAt;

    if (action === "correction") {
      await createOrderChatCorrectionIfNeeded(
        ordersPrisma,
        order.id,
        `!!! ${text}`,
        "DEMO_KANBAN",
      );
    } else if (action === "prosthetics") {
      await createOrderProstheticsRequestIfNeeded(
        ordersPrisma,
        order.id,
        `??? ${text}`,
        "DEMO_KANBAN",
      );
    }

    const row = (card.comments || []).find((c) => c.id === commentId);
    if (row) {
      const synced = await syncCrmCommentToKaiten(card, row);
      Object.assign(row, synced);
    }

    const saved = await saveTenantKanbanStateWithRetry(tenantId, next, loaded.updatedAt);
    if (!saved) continue;
    const created = (card.comments || []).find((c) => c.id === commentId) ?? localComment;
    return NextResponse.json({ ok: true, comment: created });
  }

  return NextResponse.json(
    { error: "Не удалось сохранить комментарий из-за конкурентного обновления" },
    { status: 409 },
  );
}
