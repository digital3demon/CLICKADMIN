import { formatKanbanChatMessageDisplay } from "@/lib/kanban/chat-message-display";
import { formatOrderChatPtMemoMessage } from "@/lib/order-chat-pt-memo";
import type { CardComment } from "@/lib/kanban/types";

/** Автор может править и удалять своё сообщение 12 часов после отправки. */
export const KANBAN_CHAT_AUTHOR_EDIT_WINDOW_MS = 12 * 60 * 60 * 1000;

export function isKanbanChatCommentDeleted(
  row: Pick<CardComment, "deletedAt">,
): boolean {
  return Boolean(String(row.deletedAt || "").trim());
}

export function canAuthorMutateKanbanChatMessage(opts: {
  userId: string | null | undefined;
  currentUserId: string | null | undefined;
  createdAt: string | null | undefined;
  deletedAt?: string | null;
  /** Закрытая !!! / ??? заявка — править нельзя даже в окне 12 часов. */
  requestClosed?: boolean;
  nowMs?: number;
}): boolean {
  const author = String(opts.userId || "").trim();
  const me = String(opts.currentUserId || "").trim();
  if (!author || !me || author !== me) return false;
  if (isKanbanChatCommentDeleted({ deletedAt: opts.deletedAt })) return false;
  if (opts.requestClosed) return false;
  const created = Date.parse(String(opts.createdAt || ""));
  if (!Number.isFinite(created)) return false;
  const now = opts.nowMs ?? Date.now();
  return now - created <= KANBAN_CHAT_AUTHOR_EDIT_WINDOW_MS;
}

/** Собирает полный текст после правки тела (префиксы !!! / ??? / ПТ сохраняются). */
export function applyEditedKanbanChatText(
  originalText: string,
  nextBody: string,
): string {
  const body = String(nextBody || "").replace(/[ \t]+$/gm, "").trim();
  if (!body) return "";
  const display = formatKanbanChatMessageDisplay(originalText);
  if (display.kind === "correction") return `!!! ${body}`;
  if (display.kind === "prosthetics") return `??? ${body}`;
  if (display.kind === "pt") return formatOrderChatPtMemoMessage(body);
  return body;
}

export function visibleKanbanChatComments<T extends Pick<CardComment, "deletedAt">>(
  list: readonly T[],
): T[] {
  return list.filter((row) => !isKanbanChatCommentDeleted(row));
}

/** Enter без Shift — отправка; Shift+Enter — новая строка (нативный textarea). */
export function isChatComposerSendEnter(e: {
  key: string;
  shiftKey: boolean;
}): boolean {
  return e.key === "Enter" && !e.shiftKey;
}
