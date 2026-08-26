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

/**
 * Следующая страница id (лексикографически, как Prisma orderBy id asc).
 * Без огромного `IN (...)` на всю доску — иначе SQLite/драйвер зависает на «подсчёте».
 */
export function nextLinkedOrderIdPage(
  ids: readonly string[],
  afterOrderId: string | null | undefined,
  limit: number,
): { page: string[]; finished: boolean } {
  const take = Math.max(1, Math.floor(limit));
  const sorted = [...ids].filter((id) => String(id).trim()).sort();
  const after = String(afterOrderId ?? "").trim();
  let start = 0;
  if (after) {
    start = sorted.findIndex((id) => id > after);
    if (start < 0) return { page: [], finished: true };
  }
  const page = sorted.slice(start, start + take);
  return {
    page,
    finished: page.length === 0 || start + page.length >= sorted.length,
  };
}
