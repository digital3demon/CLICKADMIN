/**
 * Поиск карточек канбана.
 * Timezone не используется. Границы токенов — не JS `\b` (кириллица).
 */
import type { KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import {
  foldOrderSearchText,
  orderSearchSignificantTokens,
  textMatchesOrderSearch,
} from "@/lib/order-search-query";

export const foldKanbanSearchText = foldOrderSearchText;

/** Слова запроса; инициалы из строки документооборота отбрасываются. */
export function kanbanSearchTokens(raw: string): string[] {
  const significant = orderSearchSignificantTokens(raw);
  if (significant.length > 0) return significant;
  const folded = foldKanbanSearchText(raw).replace(/\s+/g, " ").trim();
  if (!folded) return [];
  return folded.split(" ").filter(Boolean);
}

export function kanbanCardSearchHaystack(
  card: KanbanCard,
  board?: KanbanBoard | null,
): string {
  const typeName =
    board?.cardTypes?.find((t) => t.id === card.cardTypeId)?.name ?? "";
  const comments = (card.comments || []).map((c) => c.text || "").join(" ");
  const files = (card.files || []).map((f) => f.name || "").join(" ");
  const activity = (card.activity || []).map((a) => a.text || "").join(" ");
  const checklist = (card.checklist || []).map((i) => i.text || "").join(" ");
  /* linkedOrderId / cuid не в стоге: «214» не должно цеплять случайный фрагмент id. */
  return [
    card.title,
    card.linkedOrderNumber,
    card.description,
    typeName,
    comments,
    files,
    activity,
    checklist,
    card.continuesFromOrderNumber,
  ]
    .filter(Boolean)
    .join("\n");
}

export { haystackDigitRuns } from "@/lib/order-search-query";

export function kanbanCardMatchesSearch(
  card: KanbanCard,
  query: string,
  board?: KanbanBoard | null,
): boolean {
  return textMatchesOrderSearch(kanbanCardSearchHaystack(card, board), query);
}
