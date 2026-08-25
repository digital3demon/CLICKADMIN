import { formatKanbanChatMessageDisplay } from "@/lib/kanban/chat-message-display";

/**
 * Уточнение по корректировке «!!!»: ответ в чате на заявку,
 * мигание кнопки когда в том же треде приходит чужой ответ.
 */

export type ClarifyChatComment = {
  id: string;
  parentId?: string | number | null;
  externalCommentId?: string | null;
  externalParentId?: string | null;
  userId?: string | null;
  authorLabel?: string | null;
  text?: string;
  createdAt?: string;
  deletedAt?: string | null;
};

export type ClarifyCorrectionRef = {
  kaitenCommentId: number | null;
  text: string;
  clarifyAskedAt: Date | string | null;
  clarifyAskedByUserId: string | null;
  clarifyCommentId: string | null;
  clarifyReplyAt: Date | string | null;
  clarifyReplyAckAt: Date | string | null;
};

function commentIdSet(values: Array<string | number | null | undefined>): Set<string> {
  const out = new Set<string>();
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (s) out.add(s);
  }
  return out;
}

export function pickChatReplyToId(
  kaitenCommentId: number | null,
  comments: ClarifyChatComment[],
  correctionText: string,
): string | null {
  const kid = kaitenCommentId != null ? String(kaitenCommentId) : "";
  if (kid) {
    const byId = comments.find(
      (c) =>
        String(c.id).trim() === kid ||
        String(c.externalCommentId ?? "").trim() === kid,
    );
    if (byId) return String(byId.id);
    return kid;
  }
  const want = correctionText.trim().toLowerCase();
  if (!want) return null;
  const match = comments.find((c) => {
    const body = formatKanbanChatMessageDisplay(String(c.text ?? "")).body
      .trim()
      .toLowerCase();
    return body === want;
  });
  return match ? String(match.id) : null;
}

export function correctionThreadRootIds(
  row: Pick<ClarifyCorrectionRef, "kaitenCommentId" | "text" | "clarifyCommentId">,
  comments: ClarifyChatComment[],
): Set<string> {
  const replyTo = pickChatReplyToId(row.kaitenCommentId, comments, row.text);
  return commentIdSet([
    replyTo,
    row.kaitenCommentId,
    row.clarifyCommentId,
    ...comments
      .filter((c) => {
        const id = String(c.id).trim();
        const ext = String(c.externalCommentId ?? "").trim();
        return (
          (replyTo != null && (id === replyTo || ext === replyTo)) ||
          (row.kaitenCommentId != null &&
            (id === String(row.kaitenCommentId) ||
              ext === String(row.kaitenCommentId)))
        );
      })
      .flatMap((c) => [c.id, c.externalCommentId]),
  ]);
}

function commentCreatedMs(c: ClarifyChatComment): number {
  const t = Date.parse(String(c.createdAt ?? ""));
  return Number.isFinite(t) ? t : 0;
}

function parentIdsOf(c: ClarifyChatComment): Set<string> {
  return commentIdSet([c.parentId, c.externalParentId]);
}

/** Ответ другой стороны в треде заявки после «Уточнить». */
export function findClarifyReply(
  comments: ClarifyChatComment[],
  row: ClarifyCorrectionRef,
): ClarifyChatComment | null {
  const askedAt = row.clarifyAskedAt
    ? new Date(row.clarifyAskedAt).getTime()
    : NaN;
  if (!Number.isFinite(askedAt)) return null;
  const roots = correctionThreadRootIds(row, comments);
  if (roots.size === 0) return null;
  const asker = row.clarifyAskedByUserId?.trim() || "";

  const hits = comments.filter((c) => {
    if (c.deletedAt) return false;
    const created = commentCreatedMs(c);
    if (created <= askedAt) return false;
    if (asker && String(c.userId ?? "").trim() === asker) return false;
    const parents = parentIdsOf(c);
    for (const p of parents) {
      if (roots.has(p)) return true;
    }
    return false;
  });
  hits.sort((a, b) => commentCreatedMs(b) - commentCreatedMs(a));
  return hits[0] ?? null;
}

export function clarifyHasUnreadReply(row: {
  clarifyReplyAt: Date | string | null;
  clarifyReplyAckAt: Date | string | null;
}): boolean {
  if (!row.clarifyReplyAt) return false;
  const reply = new Date(row.clarifyReplyAt).getTime();
  if (!Number.isFinite(reply)) return false;
  if (!row.clarifyReplyAckAt) return true;
  const ack = new Date(row.clarifyReplyAckAt).getTime();
  if (!Number.isFinite(ack)) return true;
  return reply > ack;
}
