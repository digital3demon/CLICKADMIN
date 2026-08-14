import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import type { CardComment, KanbanAppState } from "@/lib/kanban/types";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";
import {
  buildKaitenCommentTextWithCrmAuthor,
  kaitenJsonIntId,
  parseKaitenListComment,
} from "@/lib/kaiten-comment-parse";
import {
  getKaitenRestAuth,
  kaitenCreateComment,
  kaitenListComments,
} from "@/lib/kaiten-rest";
import {
  createOrderChatCorrectionIfNeeded,
} from "@/lib/order-chat-correction-db";
import { createOrderProstheticsRequestIfNeeded } from "@/lib/order-prosthetics-request-db";
import { ingestCrmKanbanCommentForOrder } from "@/lib/kanban/kaiten-comments-ingest-server";
import {
  bindOrderChatInboxItemsByCrmDraft,
  markOrderChatInboxDraftSyncFailed,
} from "@/lib/order-chat-inbox-db";
import { advanceKaitenLabMentionWaterlineOnly } from "@/lib/order-kaiten-lab-mention-db";
import {
  commentBodyDedupKey,
  compactCardComments,
} from "@/lib/kanban/chat-sync";
import { resolveLinkedOrderKanbanDescription } from "@/lib/kanban/kaiten-linked-order";
import {
  loadKanbanOrderComments,
  mergeKanbanOrderComments,
  saveKanbanOrderComments,
} from "@/lib/kanban/kanban-order-comments-store";
import { normalizeProductionSettings } from "@/lib/kanban/production";
import { notifyTelegramForKanbanChatMentions } from "@/lib/kanban-chat-mention-telegram.server";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { getSiteOrigin } from "@/lib/site-origin-server";

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

async function loadOrderChatHeader(orderId: string, tenantId: string) {
  const ordersPrisma = await getOrdersPrisma();
  const row = await ordersPrisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: {
      orderNumber: true,
      patientName: true,
      clientOrderText: true,
      notes: true,
      kaitenCardId: true,
      kaitenCardDescriptionMirror: true,
      doctor: { select: { fullName: true } },
    },
  });
  if (!row) return null;
  return {
    orderNumber: row.orderNumber,
    patientName: row.patientName
      ? personNameSurnameInitials(row.patientName)
      : null,
    doctorName: personNameSurnameInitials(row.doctor.fullName) || null,
    kaitenCardId: row.kaitenCardId,
    description: resolveLinkedOrderKanbanDescription(
      {
        clientOrderText: row.clientOrderText,
        notes: row.notes,
        kaitenCardId: row.kaitenCardId,
        kaitenCardDescriptionMirror: row.kaitenCardDescriptionMirror,
      },
      false,
    ),
  };
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
  if (next.source === "KAITEN") {
    return next;
  }
  if (String(next.externalCommentId || "").trim()) {
    next.syncStatus = "synced";
    return next;
  }
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
  const bodyKey = commentBodyDedupKey(next.text);
  const authorExpected = (next.authorLabel || "CRM").trim();
  const listed = await kaitenListComments(auth, card.kaitenCardId);
  if (listed.ok && bodyKey) {
    for (const raw of listed.comments) {
      const parsed = parseKaitenListComment(raw);
      if (!parsed || commentBodyDedupKey(parsed.text) !== bodyKey) continue;
      const authorGot = (parsed.authorName || "").trim();
      if (authorGot && authorExpected && authorGot !== authorExpected) continue;
      const externalId = kaitenJsonIntId(parsed.id);
      if (externalId == null) continue;
      next.syncStatus = "synced";
      next.syncedAt = nowIso();
      next.externalCommentId = String(externalId);
      return next;
    }
  }
  const posted = await kaitenCreateComment(
    auth,
    card.kaitenCardId,
    buildKaitenCommentTextWithCrmAuthor(
      next.authorLabel || "CRM",
      next.text,
      String(next.id || "").trim() || null,
    ),
    parentExternalId,
    { burst: true },
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
  const orderIdTrim = String(orderId || "").trim();
  if (!orderIdTrim) return null;
  for (let bi = 0; bi < state.boards.length; bi += 1) {
    const board = state.boards[bi]!;
    for (let ci = 0; ci < board.columns.length; ci += 1) {
      const col = board.columns[ci]!;
      for (let i = 0; i < col.cards.length; i += 1) {
        const card = col.cards[i]!;
        if (String(card.linkedOrderId || "").trim() !== orderIdTrim) continue;
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
  const orderHeader = await loadOrderChatHeader(orderId, tenantId);
  const storedComments = await loadKanbanOrderComments(tenantId, orderId);
  const statePayload = await loadTenantKanbanState(tenantId);
  const state = statePayload.state;
  if (!state) {
    return NextResponse.json({
      ok: true,
      mode: "kanban",
      hasCard: false,
      comments: normalizeCardCommentsForApi(storedComments),
      cardImages: [],
      orderHeader,
      description: orderHeader?.description ?? "",
    });
  }
  const loc = findCardByLinkedOrderId(state, orderId);
  if (!loc) {
    return NextResponse.json({
      ok: true,
      mode: "kanban",
      hasCard: false,
      comments: normalizeCardCommentsForApi(storedComments),
      cardImages: [],
      orderHeader,
      description: orderHeader?.description ?? "",
    });
  }

  const card =
    state.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!;
  const linkedKaiten =
    (card.kaitenCardId != null && Number.isFinite(card.kaitenCardId)) ||
    (orderHeader?.kaitenCardId != null &&
      Number.isFinite(orderHeader.kaitenCardId));

  const comments = normalizeCardCommentsForApi(
    mergeKanbanOrderComments(card.comments || [], storedComments),
  );
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
    orderHeader,
    description: orderHeader?.description ?? "",
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
  const messageText =
    action === "correction"
      ? `!!! ${text}`
      : action === "prosthetics"
        ? `??? ${text}`
        : text;

  const ordersPrisma = await getOrdersPrisma();
  const order = await ordersPrisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: {
      id: true,
      orderNumber: true,
      kaitenCardId: true,
      tenant: { select: { kanbanAdminMentionTag: true } },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }

  const draftCommentId = retryCommentId || newCommentId();
  const textBodyKey = commentBodyDedupKey(messageText);

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
        return NextResponse.json(
          { error: "Комментарий для повтора не найден" },
          { status: 404 },
        );
      }
      const existing = normalizeCardComment(card.comments![existingIndex]!);
      if (existing.source !== "CRM") {
        return NextResponse.json(
          { error: "Повторить можно только CRM-комментарий" },
          { status: 400 },
        );
      }
      existing.syncStatus = "retried";
      const synced = await syncCrmCommentToKaiten(card, existing);
      card.comments![existingIndex] = synced;
      card.updatedAt = nowIso();
      const saved = await saveTenantKanbanStateWithRetry(tenantId, next, loaded.updatedAt);
      if (!saved) continue;
      try {
        await saveKanbanOrderComments(tenantId, orderId, card.comments || []);
      } catch (e) {
        console.error("[kanban-chat POST] persist CRM comments", orderId, e);
      }
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
    let row = (card.comments || []).find((c) => String(c.id || "").trim() === draftCommentId);
    if (!row && textBodyKey) {
      // Недавний такой же CRM-комментарий (в т.ч. уже synced) — не плодим дубль при double-submit.
      const recentMs = 120_000;
      const nowMs = Date.now();
      row = (card.comments || []).find((c) => {
        if (c.source !== "CRM" || c.userId !== session.sub) return false;
        if (commentBodyDedupKey(c.text) !== textBodyKey) return false;
        const cParent = String(c.parentId || "").trim() || null;
        if (cParent !== parentId) return false;
        const created = Date.parse(String(c.createdAt || ""));
        if (!Number.isFinite(created) || nowMs - created > recentMs) return false;
        return true;
      });
    }
    const createdAt = row?.createdAt || nowIso();
    const isNewComment = !row;
    if (!row) {
      row = normalizeCardComment({
        id: draftCommentId,
        userId: session.sub,
        text: messageText,
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
      card.comments = [...(card.comments || []), row];
      card.updatedAt = createdAt;

      if (action === "correction") {
        await createOrderChatCorrectionIfNeeded(
          ordersPrisma,
          order.id,
          messageText,
          "DEMO_KANBAN",
          { authorLabel },
        );
      } else if (action === "prosthetics") {
        await createOrderProstheticsRequestIfNeeded(
          ordersPrisma,
          order.id,
          messageText,
          "DEMO_KANBAN",
          { authorLabel },
        );
      }
    }

    const saved = await saveTenantKanbanStateWithRetry(tenantId, next, loaded.updatedAt);
    if (!saved) continue;
    try {
      await saveKanbanOrderComments(tenantId, orderId, card.comments || []);
    } catch (e) {
      console.error("[kanban-chat POST] persist CRM comments", orderId, e);
    }

    // Повтор того же текста (double-submit) — отдаём уже созданный комментарий без 2-го TG/inbox.
    if (!isNewComment) {
      return NextResponse.json({ ok: true, comment: row });
    }

    const inboxDraftId = String(row.id || "").trim() || draftCommentId;
    const labTag = order.tenant?.kanbanAdminMentionTag;
    try {
      await ingestCrmKanbanCommentForOrder({
        prisma: ordersPrisma,
        tenantId,
        orderId: order.id,
        commentText: messageText,
        authorLabel,
        kanbanAdminMentionTag: labTag,
        crmDraftId: inboxDraftId,
        syncState:
          card.kaitenCardId != null && Number.isFinite(card.kaitenCardId)
            ? "PENDING_EXTERNAL"
            : "LOCAL_ONLY",
      });
    } catch (e) {
      console.error("[kanban-chat POST] CRM lab mention ingest", orderId, e);
    }

    if (!String(row.externalCommentId || "").trim() && row.source === "CRM") {
      const synced = await syncCrmCommentToKaiten(card, row);
      Object.assign(row, synced);
      card.updatedAt = nowIso();
      card.comments = compactCardComments(card.comments || []);
      const externalId = kaitenJsonIntId(row.externalCommentId);
      if (externalId != null) {
        try {
          await bindOrderChatInboxItemsByCrmDraft(ordersPrisma, {
            orderId: order.id,
            crmDraftId: inboxDraftId,
            kaitenCommentId: externalId,
          });
          await advanceKaitenLabMentionWaterlineOnly(
            ordersPrisma,
            order.id,
            externalId,
          );
        } catch (e) {
          console.error(
            "[kanban-chat POST] inbox bind/waterline by draft failed",
            orderId,
            e,
          );
        }
      } else if (row.syncStatus === "failed") {
        try {
          await markOrderChatInboxDraftSyncFailed(ordersPrisma, {
            orderId: order.id,
            crmDraftId: inboxDraftId,
          });
        } catch (e) {
          console.error("[kanban-chat POST] inbox mark failed failed", orderId, e);
        }
      }
      const loadedAfterSave = await loadTenantKanbanState(tenantId);
      const savedAfterSync = await saveTenantKanbanStateWithRetry(
        tenantId,
        next,
        loadedAfterSave.updatedAt,
      );
      if (!savedAfterSync) {
        if (row.syncStatus === "synced") row.syncStatus = "failed";
        continue;
      }
      try {
        await saveKanbanOrderComments(tenantId, orderId, card.comments || []);
      } catch (e) {
        console.error("[kanban-chat POST] persist CRM comments after sync", orderId, e);
      }
    }

    const board = next.boards[loc.boardIndex]!;
    const siteOrigin = await getSiteOrigin();
    try {
      await notifyTelegramForKanbanChatMentions({
        sessionDemo: Boolean(session.demo),
        actorUserId: session.sub,
        tenantId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        kaitenCardId: order.kaitenCardId,
        text: messageText,
        siteOrigin,
        productionMentionTag: normalizeProductionSettings(board).productionMentionTag,
      });
    } catch (e) {
      console.error("[kanban-chat POST] mention tg", orderId, e);
    }

    return NextResponse.json({ ok: true, comment: row });
  }

  return NextResponse.json(
    { error: "Не удалось сохранить комментарий из-за конкурентного обновления" },
    { status: 409 },
  );
}
