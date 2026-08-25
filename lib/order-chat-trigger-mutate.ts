/**
 * Правка/удаление сообщения канбана → pending «!!!» / «???» в заказах и финотделе.
 * Закрытые (принятые / отклонённые / готовые) строки не трогаем.
 */
import type { PrismaClient } from "@prisma/client";
import { kaitenJsonIntId } from "@/lib/kaiten-comment-parse";
import {
  isOrderChatCorrectionTrigger,
  stripOrderChatCorrectionPrefix,
} from "@/lib/order-chat-correction";
import {
  createOrderChatCorrectionIfNeeded,
  orderChatCorrectionTwinTexts,
} from "@/lib/order-chat-correction-db";
import { isOrderProstheticsRequestTrigger } from "@/lib/order-prosthetics-request";
import {
  createOrderProstheticsRequestIfNeeded,
} from "@/lib/order-prosthetics-request-db";
import {
  normalizeProstheticsTwinKey,
  stripOrderProstheticsRequestPrefix,
} from "@/lib/order-prosthetics-request";
import { createOrderChatInboxItemsFromCrmComment } from "@/lib/order-chat-inbox-db";

export type ChatTriggerKind = "correction" | "prosthetics";

export function chatTriggerKindFromText(raw: string): ChatTriggerKind | null {
  if (isOrderChatCorrectionTrigger(raw)) return "correction";
  if (isOrderProstheticsRequestTrigger(raw)) return "prosthetics";
  return null;
}

/** Кнопка «!!!» / «???»: legacy-таблица + inbox, без пропуска закрытого близнеца. */
export async function persistKanbanButtonTriggers(opts: {
  db: PrismaClient;
  tenantId: string;
  orderId: string;
  action: "correction" | "prosthetics";
  messageText: string;
  commentId: string;
  authorLabel?: string | null;
  kaitenCommentId?: string | number | null;
  syncState?: "PENDING_EXTERNAL" | "SYNCED_EXTERNAL" | "LOCAL_ONLY";
}): Promise<void> {
  const orderId = opts.orderId.trim();
  const commentId = opts.commentId.trim();
  const tenantId = opts.tenantId.trim();
  if (!orderId || !commentId) return;
  const kid = kaitenJsonIntId(opts.kaitenCommentId);
  if (opts.action === "correction") {
    await createOrderChatCorrectionIfNeeded(
      opts.db,
      orderId,
      opts.messageText,
      "DEMO_KANBAN",
      { authorLabel: opts.authorLabel, kaitenCommentId: kid, forceNew: true },
    );
  } else {
    await createOrderProstheticsRequestIfNeeded(
      opts.db,
      orderId,
      opts.messageText,
      "DEMO_KANBAN",
      { authorLabel: opts.authorLabel, kaitenCommentId: kid, forceNew: true },
    );
  }
  if (!tenantId) return;
  await createOrderChatInboxItemsFromCrmComment(opts.db, {
    tenantId,
    orderId,
    text: opts.messageText,
    authorLabel: opts.authorLabel,
    crmDraftId: commentId,
    syncState:
      opts.syncState ??
      (kid != null ? "SYNCED_EXTERNAL" : "LOCAL_ONLY"),
    source: "DEMO_KANBAN",
  });
}

function pendingOpen() {
  return { resolvedAt: null, rejectedAt: null };
}

function inboxDraftWhere(orderId: string, commentId: string, kid: number | null) {
  const or: Record<string, unknown>[] = [
    { crmDraftId: commentId },
    { crmDraftId: { startsWith: `${commentId}@` } },
  ];
  if (kid != null) or.push({ kaitenCommentId: kid });
  return { orderId, OR: or };
}

async function findPendingCorrectionIds(
  db: PrismaClient,
  orderId: string,
  oldText: string,
  kid: number | null,
): Promise<string[]> {
  if (!isOrderChatCorrectionTrigger(oldText) && kid == null) return [];
  const variants = isOrderChatCorrectionTrigger(oldText)
    ? orderChatCorrectionTwinTexts(oldText)
    : [];
  const or: Record<string, unknown>[] = [];
  if (kid != null) or.push({ kaitenCommentId: kid });
  if (variants.length) or.push({ text: { in: variants } });
  if (!or.length) return [];
  const rows = await db.orderChatCorrection.findMany({
    where: { orderId, ...pendingOpen(), OR: or },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function findPendingProstheticsIds(
  db: PrismaClient,
  orderId: string,
  oldText: string,
  kid: number | null,
): Promise<string[]> {
  const was = isOrderProstheticsRequestTrigger(oldText);
  if (!was && kid == null) return [];
  const key = was
    ? normalizeProstheticsTwinKey(
        stripOrderProstheticsRequestPrefix(oldText) || oldText,
      )
    : "";
  const rows = await db.orderProstheticsRequest.findMany({
    where: { orderId, ...pendingOpen(), completedAt: null },
    select: { id: true, text: true, kaitenCommentId: true },
    take: 80,
  });
  return rows
    .filter((r) => {
      if (kid != null && r.kaitenCommentId === kid) return true;
      if (!key) return false;
      return (
        normalizeProstheticsTwinKey(
          stripOrderProstheticsRequestPrefix(r.text) || r.text,
        ) === key
      );
    })
    .map((r) => r.id);
}

async function deletePendingInboxTriggers(
  db: PrismaClient,
  orderId: string,
  commentId: string,
  kid: number | null,
  types: Array<"CORRECTION" | "PROSTHETICS">,
): Promise<void> {
  if (!types.length) return;
  await db.orderChatInboxItem.deleteMany({
    where: {
      ...inboxDraftWhere(orderId, commentId, kid),
      type: { in: types },
      ...pendingOpen(),
      completedAt: null,
    },
  });
}

async function updatePendingInboxText(
  db: PrismaClient,
  orderId: string,
  commentId: string,
  kid: number | null,
  type: "CORRECTION" | "PROSTHETICS",
  text: string,
): Promise<void> {
  await db.orderChatInboxItem.updateMany({
    where: {
      ...inboxDraftWhere(orderId, commentId, kid),
      type,
      ...pendingOpen(),
      completedAt: null,
    },
    data: { text },
  });
}

export async function applyKanbanChatTriggerSideEffects(opts: {
  db: PrismaClient;
  tenantId: string;
  orderId: string;
  commentId: string;
  oldText: string;
  /** null — сообщение удалено. */
  newText: string | null;
  kaitenCommentId?: string | number | null;
  authorLabel?: string | null;
}): Promise<void> {
  const orderId = opts.orderId.trim();
  const commentId = opts.commentId.trim();
  if (!orderId || !commentId) return;
  const kid = kaitenJsonIntId(opts.kaitenCommentId);
  const oldKind = chatTriggerKindFromText(opts.oldText);
  const newKind =
    opts.newText == null ? null : chatTriggerKindFromText(opts.newText);

  if (oldKind === "correction" && newKind !== "correction") {
    const ids = await findPendingCorrectionIds(opts.db, orderId, opts.oldText, kid);
    if (ids.length) {
      await opts.db.orderChatCorrection.deleteMany({ where: { id: { in: ids } } });
    }
    await deletePendingInboxTriggers(opts.db, orderId, commentId, kid, [
      "CORRECTION",
    ]);
  }
  if (oldKind === "prosthetics" && newKind !== "prosthetics") {
    const ids = await findPendingProstheticsIds(
      opts.db,
      orderId,
      opts.oldText,
      kid,
    );
    if (ids.length) {
      await opts.db.orderProstheticsRequest.deleteMany({
        where: { id: { in: ids } },
      });
    }
    await deletePendingInboxTriggers(opts.db, orderId, commentId, kid, [
      "PROSTHETICS",
    ]);
  }

  if (oldKind === "correction" && newKind === "correction" && opts.newText) {
    const ids = await findPendingCorrectionIds(opts.db, orderId, opts.oldText, kid);
    if (ids.length) {
      const nextBody =
        stripOrderChatCorrectionPrefix(opts.newText)?.trim() ||
        opts.newText.trim();
      await opts.db.orderChatCorrection.updateMany({
        where: { id: { in: ids } },
        data: { text: nextBody },
      });
    } else {
      await createOrderChatCorrectionIfNeeded(
        opts.db,
        orderId,
        opts.newText,
        "DEMO_KANBAN",
        { authorLabel: opts.authorLabel, kaitenCommentId: kid, forceNew: true },
      );
    }
    await updatePendingInboxText(
      opts.db,
      orderId,
      commentId,
      kid,
      "CORRECTION",
      opts.newText,
    );
    if (opts.tenantId.trim()) {
      await createOrderChatInboxItemsFromCrmComment(opts.db, {
        tenantId: opts.tenantId,
        orderId,
        text: opts.newText,
        authorLabel: opts.authorLabel,
        crmDraftId: commentId,
        syncState: kid != null ? "SYNCED_EXTERNAL" : "LOCAL_ONLY",
        source: "DEMO_KANBAN",
      });
    }
    return;
  }

  if (oldKind === "prosthetics" && newKind === "prosthetics" && opts.newText) {
    const ids = await findPendingProstheticsIds(
      opts.db,
      orderId,
      opts.oldText,
      kid,
    );
    const nextBody =
      stripOrderProstheticsRequestPrefix(opts.newText)?.trim() ||
      opts.newText.trim();
    if (ids.length) {
      await opts.db.orderProstheticsRequest.updateMany({
        where: { id: { in: ids } },
        data: { text: nextBody },
      });
    } else {
      await createOrderProstheticsRequestIfNeeded(
        opts.db,
        orderId,
        opts.newText,
        "DEMO_KANBAN",
        { authorLabel: opts.authorLabel, kaitenCommentId: kid, forceNew: true },
      );
    }
    await updatePendingInboxText(
      opts.db,
      orderId,
      commentId,
      kid,
      "PROSTHETICS",
      opts.newText,
    );
    if (opts.tenantId.trim()) {
      await createOrderChatInboxItemsFromCrmComment(opts.db, {
        tenantId: opts.tenantId,
        orderId,
        text: opts.newText,
        authorLabel: opts.authorLabel,
        crmDraftId: commentId,
        syncState: kid != null ? "SYNCED_EXTERNAL" : "LOCAL_ONLY",
        source: "DEMO_KANBAN",
      });
    }
    return;
  }

  if (newKind === "correction" && opts.newText) {
    await createOrderChatCorrectionIfNeeded(
      opts.db,
      orderId,
      opts.newText,
      "DEMO_KANBAN",
      { authorLabel: opts.authorLabel, kaitenCommentId: kid, forceNew: true },
    );
    if (opts.tenantId.trim()) {
      await createOrderChatInboxItemsFromCrmComment(opts.db, {
        tenantId: opts.tenantId,
        orderId,
        text: opts.newText,
        authorLabel: opts.authorLabel,
        crmDraftId: commentId,
        syncState: kid != null ? "SYNCED_EXTERNAL" : "LOCAL_ONLY",
        source: "DEMO_KANBAN",
      });
    }
  }
  if (newKind === "prosthetics" && opts.newText) {
    await createOrderProstheticsRequestIfNeeded(
      opts.db,
      orderId,
      opts.newText,
      "DEMO_KANBAN",
      { authorLabel: opts.authorLabel, kaitenCommentId: kid, forceNew: true },
    );
    if (opts.tenantId.trim()) {
      await createOrderChatInboxItemsFromCrmComment(opts.db, {
        tenantId: opts.tenantId,
        orderId,
        text: opts.newText,
        authorLabel: opts.authorLabel,
        crmDraftId: commentId,
        syncState: kid != null ? "SYNCED_EXTERNAL" : "LOCAL_ONLY",
        source: "DEMO_KANBAN",
      });
    }
  }
}
