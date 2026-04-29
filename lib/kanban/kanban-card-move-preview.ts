import type { KanbanAppState, KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import {
  visibleCardsInColumn,
  visibleIndexToFullInsertIndex,
} from "@/lib/kanban/board-visible-cards";

function interpolateKaitenSortOrder(
  prevSort: number | null | undefined,
  nextSort: number | null | undefined,
): number {
  const p =
    prevSort != null && typeof prevSort === "number" && Number.isFinite(prevSort)
      ? prevSort
      : null;
  const n =
    nextSort != null && typeof nextSort === "number" && Number.isFinite(nextSort)
      ? nextSort
      : null;
  if (p == null && n == null) return 1;
  if (p == null) return n! - 1;
  if (n == null) return p + 1;
  if (n > p) return (p + n) / 2;
  return p + 1;
}

/**
 * После DnD считает новый `sort_order` для карточки наряда по соседям в целевой колонке
 * (клон доски + тот же splice, что в BoardCanvas).
 */
export function previewLinkedCardKaitenSortOrderAfterDrag(
  board: KanbanBoard,
  appState: KanbanAppState,
  resolveCardHomeBoard: (card: KanbanCard) => KanbanBoard,
  fromContainer: string,
  toColId: string,
  cardId: string,
  newIndex: number,
  overIsColumn: boolean,
): number | null {
  const b = structuredClone(board) as KanbanBoard;
  const fromColB = b.columns.find((c) => c.id === fromContainer);
  if (!fromColB) return null;
  const idx = fromColB.cards.findIndex((c) => c.id === cardId);
  if (idx < 0) return null;
  const [card] = fromColB.cards.splice(idx, 1);
  if (!card?.linkedOrderId) return null;

  const toColB = b.columns.find((c) => c.id === toColId);
  if (!toColB) {
    fromColB.cards.splice(idx, 0, card);
    return null;
  }

  let visInsert = newIndex;
  if (overIsColumn) {
    visInsert = visibleCardsInColumn(toColB, appState, resolveCardHomeBoard).length;
  }

  let fullInsert = visibleIndexToFullInsertIndex(
    toColB,
    visInsert,
    appState,
    resolveCardHomeBoard,
  );
  if (fromContainer === toColId && idx < fullInsert) {
    fullInsert -= 1;
  }
  fullInsert = Math.max(0, Math.min(fullInsert, toColB.cards.length));
  toColB.cards.splice(fullInsert, 0, card);

  const linkedSeq = toColB.cards.filter((c) => c.linkedOrderId);
  const mi = linkedSeq.findIndex((c) => c.id === cardId);
  if (mi < 0) return null;

  const prevCard = mi > 0 ? linkedSeq[mi - 1] : null;
  const nextCard = mi < linkedSeq.length - 1 ? linkedSeq[mi + 1] : null;
  return interpolateKaitenSortOrder(
    prevCard?.kaitenCardSortOrder,
    nextCard?.kaitenCardSortOrder,
  );
}
