/**
 * GET /api/orders/:id/kanban-chat
 *
 * Источник ленты: tenantClientState `kanbanCommentsV1:{orderId}` + шапка наряда.
 * Timezone: даты комментариев как ISO из хранилища (не нормализуем).
 * `?local=1` / `sync=0`: CRM-лента + шапка без полного JSON канбана.
 * Kaiten при пустом store — только `after()`, ответ не ждёт.
 * Без local: после ответа ещё тянем файлы Kaiten и JSON доски (чат из списка нарядов).
 * POST: пишем CRM (лента `kanbanCommentsV1`) и сразу отвечаем; Kaiten + TG — `after()`.
 */
import { after, NextResponse } from "next/server";
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
import {
  getKaitenRestAuth,
  kaitenCreateComment,
  kaitenListComments,
} from "@/lib/kaiten-rest";
import {
  createOrderChatCorrectionIfNeeded,
} from "@/lib/order-chat-correction-db";
import { createOrderProstheticsRequestIfNeeded } from "@/lib/order-prosthetics-request-db";
import {
  formatOrderChatPtMemoMessage,
  techMemoTextFromPtChatBody,
} from "@/lib/order-chat-pt-memo";
import { applyOrderListTechMemo } from "@/lib/order-list-tech-memo.server";
import { canSendKanbanChatPtMemo } from "@/lib/auth/permissions";
import {
  ingestCrmKanbanCommentForOrder,
  ingestKaitenCommentsForOrder,
} from "@/lib/kanban/kaiten-comments-ingest-server";
import {
  bindOrderChatInboxItemsByCrmDraft,
  markOrderChatInboxDraftSyncFailed,
} from "@/lib/order-chat-inbox-db";
import { advanceKaitenLabMentionWaterlineOnly } from "@/lib/order-kaiten-lab-mention-db";
import {
  commentBodyDedupKey,
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
import {
  isOrderWorkAttachment,
  orderWorkAttachmentToChatImage,
} from "@/lib/order-work-attachments";
import { isCardFileImage } from "@/lib/kanban/card-files";
import { importMissingKaitenFilesForOrder } from "@/lib/kaiten-files-import";
import { isKanbanChatLocalOnlyRequest } from "@/lib/kanban/kanban-chat-local-query";

const KANBAN_STATE_KEY = "kanbanAppStateV3";

type ChatAction = "comment" | "correction" | "prosthetics" | "pt";

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

const ORDER_CHAT_BUNDLE_SELECT = {
  orderNumber: true,
  patientName: true,
  clientOrderText: true,
  notes: true,
  kaitenCardId: true,
  kaitenCardDescriptionMirror: true,
  invoiceAttachmentId: true,
  doctor: { select: { fullName: true } },
  attachments: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      size: true,
      createdAt: true,
      scope: true,
    },
  },
} as const;

function workImagesFromOrderRow(
  orderId: string,
  order: {
    invoiceAttachmentId: string | null;
    attachments: Array<{
      id: string;
      fileName: string;
      mimeType: string | null;
      size: number;
      createdAt: Date;
      scope: import("@prisma/client").OrderAttachmentScope;
    }>;
  },
) {
  return order.attachments
    .filter((a) => isOrderWorkAttachment(a, order.invoiceAttachmentId))
    .map((a) => orderWorkAttachmentToChatImage(orderId, a))
    .filter((x): x is NonNullable<typeof x> => x != null);
}

function orderHeaderFromRow(
  row: {
    orderNumber: string;
    patientName: string | null;
    clientOrderText: string | null;
    notes: string | null;
    kaitenCardId: number | null;
    kaitenCardDescriptionMirror: string | null;
    doctor: { fullName: string };
  },
) {
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

/** Шапка наряда + превью файлов одним запросом (без blob). */
async function loadOrderChatBundle(orderId: string, tenantId: string) {
  const ordersPrisma = await getOrdersPrisma();
  const row = await ordersPrisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: ORDER_CHAT_BUNDLE_SELECT,
  });
  if (!row) return { orderHeader: null, workImages: [] as ReturnType<typeof workImagesFromOrderRow> };
  return {
    orderHeader: orderHeaderFromRow(row),
    workImages: workImagesFromOrderRow(orderId, row),
  };
}

function mergeCardImagesWithOrderWork(
  cardFiles: Array<{ id: string; name: string; mime?: string; dataUrl?: string }>,
  fromOrder: Array<{ id: string; name: string; url: string; mime: string | null }>,
) {
  const seen = new Set(fromOrder.map((x) => x.id));
  const extra = cardFiles
    .filter((f) => isCardFileImage({ mime: f.mime || "", name: f.name }))
    .filter((f) => !seen.has(f.id) && !seen.has(`oa-${f.id}`))
    .map((f) => ({
      id: f.id,
      name: f.name,
      url: f.dataUrl || "",
      mime: f.mime ?? null,
    }))
    .filter((x) => Boolean(x.url));
  return [...fromOrder, ...extra];
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

async function hydrateEmptyKanbanCommentsFromKaiten(opts: {
  tenantId: string;
  orderId: string;
  kaitenCardId: number;
}): Promise<void> {
  const auth = getKaitenRestAuth();
  if (!auth) return;
  const comm = await kaitenListComments(auth, opts.kaitenCardId);
  if (!comm.ok) return;
  const parsed = dedupeParsedKaitenComments(
    comm.comments
      .map(parseKaitenListComment)
      .filter((x): x is NonNullable<typeof x> => x != null),
  );
  if (parsed.length === 0) return;
  const ordersPrisma = await getOrdersPrisma();
  await ingestKaitenCommentsForOrder({
    prisma: ordersPrisma,
    tenantId: opts.tenantId,
    orderId: opts.orderId,
    parsed,
  });
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
  /**
   * Карточка доски: `?local=1` — CRM-лента + шапка, без полного JSON канбана.
   * Пустое зеркало дотягиваем из Kaiten в `after()`, чтобы модалка не висела.
   */
  const localOnly = isKanbanChatLocalOnlyRequest(new URL(req.url));
  const t0 = Date.now();
  const [{ orderHeader, workImages: bundleImages }, storedComments] =
    await Promise.all([
      loadOrderChatBundle(orderId, tenantId),
      loadKanbanOrderComments(tenantId, orderId),
    ]);
  let workImages = bundleImages;

  if (localOnly) {
    const comments = normalizeCardCommentsForApi(storedComments);
    const kaitenCardId = orderHeader?.kaitenCardId;
    if (
      comments.length === 0 &&
      kaitenCardId != null &&
      Number.isFinite(kaitenCardId)
    ) {
      after(() =>
        hydrateEmptyKanbanCommentsFromKaiten({
          tenantId,
          orderId,
          kaitenCardId,
        }).catch((e) => {
          console.error("[kanban-chat GET] hydrate empty store", orderId, e);
        }),
      );
    }
    console.info("[kanban-chat GET]", {
      orderId,
      local: true,
      comments: comments.length,
      ms: Date.now() - t0,
    });
    return NextResponse.json({
      ok: true,
      mode: "kanban",
      hasCard: Boolean(orderHeader),
      comments,
      cardImages: workImages,
      linkedKaiten:
        orderHeader?.kaitenCardId != null &&
        Number.isFinite(orderHeader.kaitenCardId),
      orderHeader,
      description: orderHeader?.description ?? "",
    });
  }

  try {
    await importMissingKaitenFilesForOrder(orderId, { limit: 6 });
    const afterImport = await loadOrderChatBundle(orderId, tenantId);
    workImages = afterImport.workImages;
  } catch (e) {
    console.warn("[kanban-chat GET] kaiten file import", e);
  }
  const statePayload = await loadTenantKanbanState(tenantId);
  const state = statePayload.state;
  if (!state) {
    return NextResponse.json({
      ok: true,
      mode: "kanban",
      hasCard: false,
      comments: normalizeCardCommentsForApi(storedComments),
      cardImages: workImages,
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
      cardImages: workImages,
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
  const cardImages = mergeCardImagesWithOrderWork(card.files || [], workImages);
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

/** Kaiten + Telegram после ответа клиенту: чат CRM не ждёт внешние API. */
async function finishKanbanChatPostBackground(opts: {
  tenantId: string;
  orderId: string;
  orderNumber: string;
  kaitenCardId: number | null;
  row: CardComment;
  inboxDraftId: string;
  sessionDemo: boolean;
  actorUserId: string;
  messageText: string;
  siteOrigin: string | null;
}): Promise<void> {
  const ordersPrisma = await getOrdersPrisma();
  let row = opts.row;
  if (!String(row.externalCommentId || "").trim() && row.source === "CRM") {
    row = await syncCrmCommentToKaiten(
      { kaitenCardId: opts.kaitenCardId },
      row,
    );
    try {
      const stored = await loadKanbanOrderComments(opts.tenantId, opts.orderId);
      const merged = mergeKanbanOrderComments(
        stored.map((c) =>
          String(c.id || "").trim() === String(row.id || "").trim() ? row : c,
        ),
        [row],
      );
      await saveKanbanOrderComments(opts.tenantId, opts.orderId, merged);
    } catch (e) {
      console.error("[kanban-chat POST] background comments save", opts.orderId, e);
    }
    const externalId = kaitenJsonIntId(row.externalCommentId);
    if (externalId != null) {
      try {
        await bindOrderChatInboxItemsByCrmDraft(ordersPrisma, {
          orderId: opts.orderId,
          crmDraftId: opts.inboxDraftId,
          kaitenCommentId: externalId,
        });
        await advanceKaitenLabMentionWaterlineOnly(
          ordersPrisma,
          opts.orderId,
          externalId,
        );
      } catch (e) {
        console.error(
          "[kanban-chat POST] inbox bind/waterline by draft failed",
          opts.orderId,
          e,
        );
      }
    } else if (row.syncStatus === "failed") {
      try {
        await markOrderChatInboxDraftSyncFailed(ordersPrisma, {
          orderId: opts.orderId,
          crmDraftId: opts.inboxDraftId,
        });
      } catch (e) {
        console.error("[kanban-chat POST] inbox mark failed failed", opts.orderId, e);
      }
    }
    try {
      const loaded = await loadTenantKanbanState(opts.tenantId);
      const loc = loaded.state
        ? findCardByLinkedOrderId(loaded.state, opts.orderId)
        : null;
      if (loaded.state && loc) {
        const next = structuredClone(loaded.state);
        const card =
          next.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[
            loc.cardIndex
          ]!;
        card.comments = mergeKanbanOrderComments(card.comments || [], [row]);
        card.updatedAt = nowIso();
        await saveTenantKanbanStateWithRetry(
          opts.tenantId,
          next,
          loaded.updatedAt,
        );
      }
    } catch (e) {
      console.error("[kanban-chat POST] background state merge", opts.orderId, e);
    }
  }

  try {
    let productionMentionTag: string | undefined;
    const loaded = await loadTenantKanbanState(opts.tenantId);
    const loc = loaded.state
      ? findCardByLinkedOrderId(loaded.state, opts.orderId)
      : null;
    if (loaded.state && loc) {
      productionMentionTag = normalizeProductionSettings(
        loaded.state.boards[loc.boardIndex]!,
      ).productionMentionTag;
    }
    await notifyTelegramForKanbanChatMentions({
      sessionDemo: opts.sessionDemo,
      actorUserId: opts.actorUserId,
      tenantId: opts.tenantId,
      orderId: opts.orderId,
      orderNumber: opts.orderNumber,
      kaitenCardId: opts.kaitenCardId,
      text: opts.messageText,
      siteOrigin: opts.siteOrigin,
      productionMentionTag,
    });
  } catch (e) {
    console.error("[kanban-chat POST] mention tg", opts.orderId, e);
  }
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
  const action: ChatAction =
    body.action === "correction" ||
    body.action === "prosthetics" ||
    body.action === "pt"
      ? body.action
      : "comment";
  if (action === "pt" && !canSendKanbanChatPtMemo(session.role)) {
    return NextResponse.json(
      { error: "Кнопка «ПТ» недоступна для этой роли" },
      { status: 403 },
    );
  }
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
        : action === "pt"
          ? formatOrderChatPtMemoMessage(text)
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

  if (retryCommentId) {
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
        const stored = await loadKanbanOrderComments(tenantId, orderId);
        const withRetry = stored.map((c) =>
          String(c.id || "").trim() === retryCommentId ? synced : c,
        );
        if (!withRetry.some((c) => String(c.id || "").trim() === retryCommentId)) {
          withRetry.push(synced);
        }
        await saveKanbanOrderComments(
          tenantId,
          orderId,
          mergeKanbanOrderComments(card.comments || [], withRetry),
        );
      } catch (e) {
        console.error("[kanban-chat POST] persist CRM comments", orderId, e);
      }
      return NextResponse.json({ ok: true, comment: synced });
    }
    return NextResponse.json(
      { error: "Не удалось сохранить комментарий из-за конкурентного обновления" },
      { status: 409 },
    );
  }

  const storedComments = await loadKanbanOrderComments(tenantId, orderId);
  const authorLabel = userActivityDisplayLabel({
    mentionHandle: null,
    displayName: session.name?.trim() || null,
    email: session.email || null,
  });
  const parentId = String(body.parentId || "").trim() || null;
  const parent = parentId
    ? storedComments.find((c) => String(c.id || "").trim() === parentId)
    : null;
  const recentMs = 120_000;
  const nowMs = Date.now();
  const dup = textBodyKey
    ? storedComments.find((c) => {
        if (c.source !== "CRM" || c.userId !== session.sub) return false;
        if (commentBodyDedupKey(c.text) !== textBodyKey) return false;
        const cParent = String(c.parentId || "").trim() || null;
        if (cParent !== parentId) return false;
        const created = Date.parse(String(c.createdAt || ""));
        if (!Number.isFinite(created) || nowMs - created > recentMs) return false;
        return true;
      })
    : undefined;
  if (dup) {
    return NextResponse.json({ ok: true, comment: dup });
  }

  const createdAt = nowIso();
  const row = normalizeCardComment({
    id: draftCommentId,
    userId: session.sub,
    text: messageText,
    createdAt,
    parentId,
    authorLabel,
    source: "CRM",
    syncStatus:
      order.kaitenCardId != null && Number.isFinite(order.kaitenCardId)
        ? "pending"
        : "local",
    syncedAt: null,
    externalCommentId: null,
    externalParentId: parent?.externalCommentId ?? null,
  });
  try {
    await saveKanbanOrderComments(tenantId, orderId, [...storedComments, row]);
  } catch (e) {
    console.error("[kanban-chat POST] persist CRM comments", orderId, e);
    return NextResponse.json(
      { error: "Не удалось сохранить комментарий" },
      { status: 500 },
    );
  }

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
  } else if (action === "pt") {
    const memoText = techMemoTextFromPtChatBody(messageText);
    if (memoText) {
      try {
        await applyOrderListTechMemo(ordersPrisma, {
          orderId: order.id,
          tenantId,
          userId: session.sub,
          text: memoText,
        });
      } catch (e) {
        const code = e instanceof Error ? e.message : "";
        if (code === "ORDER_NOT_FOUND") {
          return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
        }
        if (code === "USER_NOT_FOUND") {
          return NextResponse.json(
            { error: "Пользователь не найден" },
            { status: 403 },
          );
        }
        console.error("[kanban-chat POST] PT memo", orderId, e);
        return NextResponse.json(
          { error: "Не удалось записать пометку ПТ" },
          { status: 500 },
        );
      }
    }
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
        order.kaitenCardId != null && Number.isFinite(order.kaitenCardId)
          ? "PENDING_EXTERNAL"
          : "LOCAL_ONLY",
    });
  } catch (e) {
    console.error("[kanban-chat POST] CRM lab mention ingest", orderId, e);
  }

  const siteOrigin = await getSiteOrigin();
  after(() =>
    finishKanbanChatPostBackground({
      tenantId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      kaitenCardId: order.kaitenCardId,
      row,
      inboxDraftId,
      sessionDemo: Boolean(session.demo),
      actorUserId: session.sub,
      messageText,
      siteOrigin,
    }).catch((e) => {
      console.error("[kanban-chat POST] background", orderId, e);
    }),
  );

  return NextResponse.json({ ok: true, comment: row });
}
