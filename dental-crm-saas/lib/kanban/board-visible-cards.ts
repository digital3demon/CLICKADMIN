import type { KanbanAppState, KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import { cardMatchesFilters } from "@/lib/kanban/model";

export function visibleCardsInColumn(
  col: KanbanBoard["columns"][0],
  state: KanbanAppState,
  resolveCardHomeBoard: (card: KanbanCard) => KanbanBoard,
): KanbanCard[] {
  return col.cards.filter((c) =>
    cardMatchesFilters(c, resolveCardHomeBoard(c), state),
  );
}

/** Индекс в списке видимых карточек → индекс вставки в полный `col.cards` (как у Sortable по DOM). */
export function visibleIndexToFullInsertIndex(
  col: KanbanBoard["columns"][0],
  visibleInsertIndex: number,
  state: KanbanAppState,
  resolveCardHomeBoard: (card: KanbanCard) => KanbanBoard,
): number {
  const vis = visibleCardsInColumn(col, state, resolveCardHomeBoard);
  if (vis.length === 0) return 0;
  if (visibleInsertIndex <= 0) {
    return col.cards.findIndex((c) => c.id === vis[0].id);
  }
  if (visibleInsertIndex >= vis.length) {
    const last = vis[vis.length - 1];
    const li = col.cards.findIndex((c) => c.id === last.id);
    return li < 0 ? col.cards.length : li + 1;
  }
  const target = vis[visibleInsertIndex];
  return col.cards.findIndex((c) => c.id === target.id);
}
