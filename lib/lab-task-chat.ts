/** Мини-чат задачи: кто/когда, ответ, правка и удаление 1 час. */

export const LAB_TASK_CHAT_EDIT_WINDOW_MS = 60 * 60 * 1000;
export const LAB_TASK_CHAT_MAX_TEXT_LEN = 2000;

export type LabTaskChatCommentJson = {
  id: string;
  authorUserId: string | null;
  authorLabel: string;
  text: string;
  parentId: string | null;
  parentPreview: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  canMutate: boolean;
};

export function canMutateLabTaskChatMessage(opts: {
  authorUserId: string | null | undefined;
  viewerUserId: string | null | undefined;
  createdAt: string | Date;
  deletedAt?: string | Date | null;
  nowMs?: number;
}): boolean {
  const author = String(opts.authorUserId || "").trim();
  const me = String(opts.viewerUserId || "").trim();
  if (!author || !me || author !== me) return false;
  if (opts.deletedAt) return false;
  const created = new Date(opts.createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  const now = opts.nowMs ?? Date.now();
  return now - created <= LAB_TASK_CHAT_EDIT_WINDOW_MS;
}

export function labTaskChatHasUnread(opts: {
  viewerUserId: string;
  seenAt: string | Date | null | undefined;
  comments: ReadonlyArray<{
    authorUserId?: string | null;
    createdAt: string | Date;
    deletedAt?: string | Date | null;
  }>;
}): boolean {
  const me = String(opts.viewerUserId || "").trim();
  if (!me || opts.comments.length === 0) return false;
  const seenMs = opts.seenAt ? new Date(opts.seenAt).getTime() : 0;
  const seen = Number.isFinite(seenMs) ? seenMs : 0;
  return opts.comments.some((c) => {
    if (c.deletedAt) return false;
    const author = String(c.authorUserId || "").trim();
    if (author && author === me) return false;
    const at = new Date(c.createdAt).getTime();
    return Number.isFinite(at) && at > seen;
  });
}

export function labTaskChatPreviewText(text: string, max = 80): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
