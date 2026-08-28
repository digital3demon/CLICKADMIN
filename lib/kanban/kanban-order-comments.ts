import type { CardComment, KanbanAppState } from "@/lib/kanban/types";
import {
  compactCardComments,
  normalizeCardComment,
  upsertKaitenCommentsToCard,
  type KaitenCommentForSync,
} from "@/lib/kanban/chat-sync";
import { forEachKanbanCardInState } from "@/lib/kanban/kanban-stage-due";

/** Отдельный ключ: slim kanbanAppStateV3 обнуляет card.comments. */
export function kanbanOrderCommentsStateKey(orderId: string): string {
  return `kanbanCommentsV1:${orderId.trim()}`;
}

export const KANBAN_ORDER_COMMENTS_MAX = 200;

type Stored = { comments?: unknown };

export function parseStoredKanbanOrderComments(raw: unknown): CardComment[] {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as Stored).comments;
  if (!Array.isArray(list)) return [];
  return compactCardComments(
    list
      .filter((row): row is CardComment => row != null && typeof row === "object")
      .map((row) => normalizeCardComment(row as CardComment)),
  ).slice(-KANBAN_ORDER_COMMENTS_MAX);
}

/**
 * Пустой incoming не затирает store: slim JSON всегда `comments=[]`,
 * частичный ingest не должен стереть «оставленное в канбане».
 */
export function resolveKanbanOrderCommentsToPersist(
  incoming: CardComment[],
  existing: CardComment[],
): CardComment[] | "keep-existing" {
  if (incoming.length === 0 && existing.length > 0) return "keep-existing";
  return mergeKanbanOrderComments(incoming, existing);
}

/** Текстовые сообщения с живых карточек — до slim persist (кириллица в теле ок). */
export function collectLinkedOrderCommentsFromState(
  state: KanbanAppState,
): Map<string, CardComment[]> {
  const byOrder = new Map<string, CardComment[]>();
  forEachKanbanCardInState(state, (card) => {
    const oid = String(card.linkedOrderId || "").trim();
    if (!oid) return;
    const rows = (card.comments || []).filter((c) => {
      if (String(c.imageFileId || "").trim()) return true;
      return String(c.text || "").trim().length > 0;
    });
    if (rows.length === 0) return;
    const prev = byOrder.get(oid) ?? [];
    byOrder.set(oid, mergeKanbanOrderComments(rows, prev));
  });
  return byOrder;
}

/** Слить ленту карточки с persisted CRM-чатом (после slim comments=[]). */
export function mergeKanbanOrderComments(
  fromCard: CardComment[] | undefined,
  fromStore: CardComment[],
): CardComment[] {
  const byId = new Map<string, CardComment>();
  for (const row of [...(fromCard || []), ...fromStore]) {
    const n = normalizeCardComment(row);
    const key =
      String(n.id || "").trim() ||
      String(n.externalCommentId || "").trim() ||
      `${n.createdAt}:${n.text}`;
    if (!key) continue;
    const prev = byId.get(key);
    if (!prev) {
      byId.set(key, n);
      continue;
    }
    const prevScore = prev.syncStatus === "synced" ? 2 : 1;
    const nextScore = n.syncStatus === "synced" ? 2 : 1;
    if (nextScore >= prevScore) byId.set(key, n);
  }
  return compactCardComments([...byId.values()]);
}

/**
 * Ingest Kaiten → лента CRM: база = slim card + persisted store, затем upsert.
 * Нельзя мержить только в `card.comments` (после slim это `[]`) — иначе
 * частичный ответ Kaiten затирает `kanbanCommentsV1`.
 */
export function mergeIncomingKaitenIntoKanbanComments(
  fromCard: CardComment[] | undefined,
  fromStore: CardComment[],
  incoming: readonly KaitenCommentForSync[],
): { next: CardComment[]; changed: boolean } {
  const existing = mergeKanbanOrderComments(fromCard, fromStore);
  return upsertKaitenCommentsToCard(existing, [...incoming]);
}
