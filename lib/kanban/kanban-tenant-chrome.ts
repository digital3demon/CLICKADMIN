/**
 * Tenant JSON — каркас досок + карточки без наряда.
 * Linked-карточки живут в Order / board-tiles, иначе 600 КБ и «дыры» после slim.
 */
import type { KanbanAppState, KanbanBoard } from "@/lib/kanban/types";

function isLinkedCard(card: { linkedOrderId?: string }): boolean {
  return Boolean(String(card.linkedOrderId || "").trim());
}

function stripBoardLinkedCards(board: KanbanBoard): void {
  for (const col of board.columns || []) {
    col.cards = (col.cards || []).filter((c) => !isLinkedCard(c));
  }
  /* СТОП и архив — не тысячи живых плиток. Их нельзя выкидывать из tenant JSON. */
}

/** Перед PUT tenant: убрать наряды из колонок. Standalone (без linkedOrderId) остаются. */
export function stripLinkedOrderCardsForTenantChrome(
  state: KanbanAppState,
): KanbanAppState {
  const next = structuredClone(state);
  for (const board of next.boards || []) {
    stripBoardLinkedCards(board);
  }
  return next;
}

export function countLinkedCardsInKanbanState(state: KanbanAppState): number {
  let n = 0;
  for (const board of state.boards || []) {
    for (const col of board.columns || []) {
      for (const c of col.cards || []) {
        if (isLinkedCard(c)) n += 1;
      }
    }
  }
  return n;
}
