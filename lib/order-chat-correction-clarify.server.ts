import "server-only";

import type { PrismaClient } from "@prisma/client";
import { loadKanbanOrderComments } from "@/lib/kanban/kanban-order-comments-store";
import {
  clarifyHasUnreadReply,
  findClarifyReply,
  type ClarifyChatComment,
  type ClarifyCorrectionRef,
} from "@/lib/order-chat-correction-clarify";

const clarifySelect = {
  id: true,
  kaitenCommentId: true,
  text: true,
  clarifyAskedAt: true,
  clarifyAskedByUserId: true,
  clarifyCommentId: true,
  clarifyReplyAt: true,
  clarifyReplyAckAt: true,
  resolvedAt: true,
  rejectedAt: true,
} as const;

function toRef(row: ClarifyCorrectionRef): ClarifyCorrectionRef {
  return row;
}

function commentsForDetect(
  comments: ClarifyChatComment[],
): ClarifyChatComment[] {
  return comments.map((c) => ({
    id: String(c.id),
    parentId: c.parentId ?? null,
    externalCommentId: c.externalCommentId ?? null,
    externalParentId: c.externalParentId ?? null,
    userId: c.userId ?? null,
    authorLabel: c.authorLabel ?? null,
    text: c.text,
    createdAt: c.createdAt,
    deletedAt: c.deletedAt ?? null,
  }));
}

async function updateClarifyPair(
  db: PrismaClient,
  orderId: string,
  ids: { inbox: string[]; legacy: string[] },
  data: Record<string, unknown>,
): Promise<void> {
  if (ids.legacy.length > 0) {
    await db.orderChatCorrection.updateMany({
      where: { orderId, id: { in: ids.legacy } },
      data,
    });
  }
  if (ids.inbox.length > 0) {
    await (db as any).orderChatInboxItem.updateMany({
      where: { orderId, type: "CORRECTION", id: { in: ids.inbox } },
      data,
    });
  }
}

async function pairIdsForCorrection(
  db: PrismaClient,
  orderId: string,
  correctionId: string,
): Promise<{ inbox: string[]; legacy: string[]; row: ClarifyCorrectionRef & { id: string } } | null> {
  const oid = orderId.trim();
  const cid = correctionId.trim();
  const inboxRow = (await (db as any).orderChatInboxItem.findFirst({
    where: { id: cid, orderId: oid, type: "CORRECTION" },
    select: clarifySelect,
  })) as (ClarifyCorrectionRef & { id: string }) | null;
  const legacyRow = (await db.orderChatCorrection.findFirst({
    where: { id: cid, orderId: oid },
    select: clarifySelect,
  })) as (ClarifyCorrectionRef & { id: string }) | null;
  const primary = inboxRow ?? legacyRow;
  if (!primary) return null;
  if (primary.resolvedAt != null || primary.rejectedAt != null) return null;

  const inbox = new Set<string>();
  const legacy = new Set<string>();
  if (inboxRow) inbox.add(inboxRow.id);
  if (legacyRow) legacy.add(legacyRow.id);
  const kid = inboxRow?.kaitenCommentId ?? legacyRow?.kaitenCommentId ?? null;
  if (kid != null) {
    const twinsIn = (await (db as any).orderChatInboxItem.findMany({
      where: {
        orderId: oid,
        type: "CORRECTION",
        kaitenCommentId: kid,
        resolvedAt: null,
        rejectedAt: null,
      },
      select: { id: true },
    })) as Array<{ id: string }>;
    for (const t of twinsIn) inbox.add(t.id);
    const twinsL = await db.orderChatCorrection.findMany({
      where: {
        orderId: oid,
        kaitenCommentId: kid,
        resolvedAt: null,
        rejectedAt: null,
      },
      select: { id: true },
    });
    for (const t of twinsL) legacy.add(t.id);
  }
  return { inbox: [...inbox], legacy: [...legacy], row: primary };
}

export async function markClarifyAskedIfParentIsPendingCorrection(opts: {
  db: PrismaClient;
  orderId: string;
  parentCommentId: string | null;
  parentExternalId?: string | null;
  newCommentId: string;
  userId: string;
}): Promise<void> {
  const parentId = String(opts.parentCommentId ?? "").trim();
  if (!parentId) return;
  const oid = opts.orderId.trim();
  const ext = String(opts.parentExternalId ?? "").trim();
  const numIds: number[] = [];
  for (const raw of [parentId, ext]) {
    const n = Number(raw);
    if (Number.isFinite(n) && Number.isInteger(n) && n > 0) numIds.push(n);
  }

  const inboxHits = (await (opts.db as any).orderChatInboxItem.findMany({
    where: {
      orderId: oid,
      type: "CORRECTION",
      resolvedAt: null,
      rejectedAt: null,
      OR: [
        ...(numIds.length ? [{ kaitenCommentId: { in: numIds } }] : []),
        { crmDraftId: parentId },
      ],
    },
    select: { id: true },
    take: 8,
  })) as Array<{ id: string }>;

  const legacyHits = await opts.db.orderChatCorrection.findMany({
    where: {
      orderId: oid,
      resolvedAt: null,
      rejectedAt: null,
      ...(numIds.length ? { kaitenCommentId: { in: numIds } } : { id: "__none__" }),
    },
    select: { id: true },
    take: 8,
  });

  const ids = [
    ...inboxHits.map((r) => r.id),
    ...legacyHits.map((r) => r.id),
  ];
  const unique = [...new Set(ids)];
  if (unique.length === 0) return;

  const now = new Date();
  const data = {
    clarifyAskedAt: now,
    clarifyAskedByUserId: opts.userId,
    clarifyCommentId: opts.newCommentId,
    clarifyReplyAt: null,
    clarifyReplyAckAt: null,
  };
  for (const id of unique) {
    const pair = await pairIdsForCorrection(opts.db, oid, id);
    if (!pair) continue;
    await updateClarifyPair(opts.db, oid, pair, data);
  }
}

export async function ackCorrectionClarifyReply(opts: {
  db: PrismaClient;
  orderId: string;
  correctionId: string;
}): Promise<boolean> {
  const pair = await pairIdsForCorrection(opts.db, opts.orderId, opts.correctionId);
  if (!pair) return false;
  await updateClarifyPair(opts.db, opts.orderId.trim(), pair, {
    clarifyReplyAckAt: new Date(),
  });
  return true;
}

export async function persistClarifyRepliesFromComments(opts: {
  db: PrismaClient;
  orderId: string;
  comments: ClarifyChatComment[];
}): Promise<void> {
  const oid = opts.orderId.trim();
  const comments = commentsForDetect(opts.comments);
  const pending = await opts.db.orderChatCorrection.findMany({
    where: {
      orderId: oid,
      resolvedAt: null,
      rejectedAt: null,
      clarifyAskedAt: { not: null },
    },
    select: clarifySelect,
    take: 40,
  });
  const inboxPending = (await (opts.db as any).orderChatInboxItem.findMany({
    where: {
      orderId: oid,
      type: "CORRECTION",
      resolvedAt: null,
      rejectedAt: null,
      clarifyAskedAt: { not: null },
    },
    select: clarifySelect,
    take: 40,
  })) as Array<ClarifyCorrectionRef & { id: string }>;

  const seen = new Set<string>();
  const rows = [...pending, ...inboxPending].filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  for (const row of rows) {
    const hit = findClarifyReply(comments, toRef(row));
    if (!hit?.createdAt) continue;
    const replyAt = new Date(hit.createdAt);
    if (Number.isNaN(replyAt.getTime())) continue;
    if (
      row.clarifyReplyAt &&
      !clarifyHasUnreadReply(row) &&
      replyAt.getTime() <= new Date(row.clarifyReplyAckAt!).getTime()
    ) {
      continue;
    }
    if (
      row.clarifyReplyAt &&
      new Date(row.clarifyReplyAt).getTime() === replyAt.getTime()
    ) {
      continue;
    }
    const pair = await pairIdsForCorrection(opts.db, oid, row.id);
    if (!pair) continue;
    await updateClarifyPair(opts.db, oid, pair, { clarifyReplyAt: replyAt });
  }
}

export async function syncClarifyRepliesForOrder(opts: {
  db: PrismaClient;
  tenantId: string;
  orderId: string;
}): Promise<void> {
  const comments = await loadKanbanOrderComments(opts.tenantId, opts.orderId);
  await persistClarifyRepliesFromComments({
    db: opts.db,
    orderId: opts.orderId,
    comments,
  });
}
