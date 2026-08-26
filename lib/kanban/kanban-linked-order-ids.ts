import type { KanbanAppState } from "@/lib/kanban/types";

/** Наряды с карточкой в колонках доски (не архив и не СТОП). */
export function linkedOrderIdsOnKanbanBoard(
  state: KanbanAppState | null | undefined,
): string[] {
  if (!state) return [];
  const ids = new Set<string>();
  for (const board of state.boards ?? []) {
    for (const col of board.columns ?? []) {
      for (const card of col.cards ?? []) {
        const oid = String(card.linkedOrderId || "").trim();
        if (oid) ids.add(oid);
      }
    }
  }
  return [...ids];
}
