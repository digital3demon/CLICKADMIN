/**
 * Закрытая заявка из чата: корректировка внесена / отклонена,
 * протетика заказана / закрыта. Тогда править и удалять сообщение нельзя
 * даже внутри окна 12 часов.
 */
import { formatKanbanChatMessageDisplay } from "@/lib/kanban/chat-message-display";
import type { CardComment } from "@/lib/kanban/types";
import { orderChatCorrectionTwinTexts } from "@/lib/order-chat-correction-db";
import {
  normalizeProstheticsTwinKey,
  stripOrderProstheticsRequestPrefix,
} from "@/lib/order-prosthetics-request";

export type KanbanChatRequestKind = "correction" | "prosthetics";

export type KanbanChatRequestClosedRow = {
  kind: KanbanChatRequestKind;
  text: string;
  createdAt: Date | string;
  crmDraftId?: string | null;
  kaitenCommentId?: number | null;
  resolvedAt?: Date | string | null;
  rejectedAt?: Date | string | null;
  orderedAt?: Date | string | null;
  completedAt?: Date | string | null;
};

function hasTs(value: Date | string | null | undefined): boolean {
  if (value == null) return false;
  if (value instanceof Date) return Number.isFinite(value.getTime());
  return Boolean(String(value).trim());
}

export function isKanbanChatRequestLifecycleClosed(
  row: Pick<
    KanbanChatRequestClosedRow,
    "resolvedAt" | "rejectedAt" | "orderedAt" | "completedAt"
  >,
): boolean {
  return (
    hasTs(row.resolvedAt) ||
    hasTs(row.rejectedAt) ||
    hasTs(row.orderedAt) ||
    hasTs(row.completedAt)
  );
}

export function kanbanChatRequestKindFromText(
  text: string,
): KanbanChatRequestKind | null {
  const kind = formatKanbanChatMessageDisplay(text).kind;
  if (kind === "correction" || kind === "prosthetics") return kind;
  return null;
}

function commentKaitenId(
  comment: Pick<CardComment, "externalCommentId">,
): number | null {
  const raw = String(comment.externalCommentId || "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function draftMatchesComment(crmDraftId: string | null | undefined, commentId: string): boolean {
  const draft = String(crmDraftId || "").trim();
  const id = String(commentId || "").trim();
  if (!draft || !id) return false;
  return draft === id || draft.startsWith(`${id}@u:`);
}

function prostheticsTwinKey(raw: string): string {
  return normalizeProstheticsTwinKey(
    stripOrderProstheticsRequestPrefix(raw)?.trim() || raw,
  );
}

function textsMatchRequest(
  kind: KanbanChatRequestKind,
  commentText: string,
  rowText: string,
): boolean {
  if (kind === "correction") {
    const variants = new Set(orderChatCorrectionTwinTexts(commentText));
    return variants.has(String(rowText || "").trim());
  }
  const a = prostheticsTwinKey(commentText);
  const b = prostheticsTwinKey(rowText);
  return Boolean(a && b && a === b);
}

function createdAtMs(value: Date | string | null | undefined): number {
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : 0;
  }
  const t = Date.parse(String(value || ""));
  return Number.isFinite(t) ? t : 0;
}

export function pickMatchingKanbanChatRequestRow(
  comment: Pick<CardComment, "id" | "text" | "createdAt" | "externalCommentId">,
  rows: readonly KanbanChatRequestClosedRow[],
): KanbanChatRequestClosedRow | null {
  const kind = kanbanChatRequestKindFromText(comment.text);
  if (!kind) return null;
  const ofKind = rows.filter((row) => row.kind === kind);
  if (!ofKind.length) return null;

  const byId = ofKind.filter(
    (row) =>
      draftMatchesComment(row.crmDraftId, comment.id) ||
      (commentKaitenId(comment) != null &&
        row.kaitenCommentId === commentKaitenId(comment)),
  );
  if (byId.length === 1) return byId[0]!;
  if (byId.length > 1) {
    return pickClosestCreated(comment.createdAt, byId);
  }

  const byText = ofKind.filter((row) =>
    textsMatchRequest(kind, comment.text, row.text),
  );
  if (!byText.length) return null;
  return pickClosestCreated(comment.createdAt, byText);
}

function pickClosestCreated(
  commentCreatedAt: string | null | undefined,
  rows: readonly KanbanChatRequestClosedRow[],
): KanbanChatRequestClosedRow {
  const t = createdAtMs(commentCreatedAt);
  let best = rows[0]!;
  let bestGap = Math.abs(createdAtMs(best.createdAt) - t);
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i]!;
    const gap = Math.abs(createdAtMs(row.createdAt) - t);
    if (gap < bestGap) {
      best = row;
      bestGap = gap;
    }
  }
  return best;
}

export function isKanbanChatCommentRequestClosed(
  comment: Pick<CardComment, "id" | "text" | "createdAt" | "externalCommentId">,
  rows: readonly KanbanChatRequestClosedRow[],
): boolean {
  const match = pickMatchingKanbanChatRequestRow(comment, rows);
  return match != null && isKanbanChatRequestLifecycleClosed(match);
}

export function annotateKanbanCommentsRequestClosed<T extends CardComment>(
  comments: readonly T[],
  rows: readonly KanbanChatRequestClosedRow[],
): T[] {
  return comments.map((comment) => ({
    ...comment,
    requestClosed: isKanbanChatCommentRequestClosed(comment, rows),
  }));
}

/** Переносит флаг с ответа GET /kanban-chat на ленту после merge Kaiten. */
export function mergeRequestClosedFlags<T extends CardComment>(
  comments: readonly T[],
  flagged: readonly Pick<CardComment, "id" | "externalCommentId" | "requestClosed">[],
): T[] {
  const closedIds = new Set<string>();
  const closedExt = new Set<string>();
  for (const row of flagged) {
    if (!row.requestClosed) continue;
    closedIds.add(String(row.id || "").trim());
    const ext = String(row.externalCommentId || "").trim();
    if (ext) closedExt.add(ext);
  }
  if (!closedIds.size && !closedExt.size) return [...comments];
  return comments.map((comment) => {
    const ext = String(comment.externalCommentId || "").trim();
    const closed =
      Boolean(comment.requestClosed) ||
      closedIds.has(String(comment.id || "").trim()) ||
      (ext ? closedExt.has(ext) : false);
    return closed === comment.requestClosed ? comment : { ...comment, requestClosed: closed };
  });
}
