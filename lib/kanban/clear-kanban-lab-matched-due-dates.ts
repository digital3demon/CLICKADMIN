import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";

/** Канон YYYY-MM-DD для сравнения сроков. */
export function normalizeKanbanDueDate(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  return s.slice(0, 10);
}

/**
 * Сброс card.dueDate, если карточка привязана к наряду и дата совпадает с лаб. сроком.
 * @returns true, если dueDate очищен
 */
export function clearLabMatchedDueDateOnCard(
  card: KanbanCard,
  orderDueById: ReadonlyMap<string, string>,
): boolean {
  const linked = (card.linkedOrderId ?? "").trim();
  if (!linked) return false;
  const labDue = normalizeKanbanDueDate(orderDueById.get(linked));
  if (!labDue) return false;
  const cardDue = normalizeKanbanDueDate(card.dueDate);
  if (!cardDue || cardDue !== labDue) return false;
  card.dueDate = "";
  return true;
}

/** Обход kanbanAppStateV3: колонки, архив, СТОП. */
export function clearLabMatchedDueDatesInKanbanState(
  state: KanbanAppState,
  orderDueById: ReadonlyMap<string, string>,
): { state: KanbanAppState; clearedCount: number } {
  const next = structuredClone(state);
  let clearedCount = 0;
  const touch = (card: KanbanCard) => {
    if (clearLabMatchedDueDateOnCard(card, orderDueById)) clearedCount += 1;
  };
  for (const board of next.boards ?? []) {
    for (const col of board.columns ?? []) {
      for (const card of col.cards ?? []) touch(card);
    }
    for (const ac of board.archivedCards ?? []) {
      if (ac?.card) touch(ac.card);
    }
    for (const sc of board.stoppedCards ?? []) {
      if (sc?.card) touch(sc.card);
    }
  }
  return { state: next, clearedCount };
}
