/**
 * СТОП — общая парковка: на обычной доске видны все.
 * На «Мои» / «Ответственный» режет `keep` (как колонки), иначе кнопка «Мои» в СТОПе пустая.
 */
import { kanbanCardMatchesSearch } from "@/lib/kanban/kanban-card-search";
import type { KanbanBoard, KanbanCard, KanbanStoppedCard } from "@/lib/kanban/types";

export function collectSharedStoppedCards(
  homes: readonly KanbanBoard[],
  search?: string,
  keep?: (card: KanbanCard, home: KanbanBoard) => boolean,
): KanbanStoppedCard[] {
  const q = (search || "").trim();
  const seen = new Set<string>();
  const rows: KanbanStoppedCard[] = [];
  for (const home of homes) {
    for (const row of home.stoppedCards || []) {
      if (!row?.card || seen.has(row.card.id)) continue;
      if (keep && !keep(row.card, home)) continue;
      if (q && !kanbanCardMatchesSearch(row.card, q, home)) continue;
      seen.add(row.card.id);
      rows.push(row);
    }
  }
  return rows.sort((a, b) =>
    String(b.stoppedAt).localeCompare(String(a.stoppedAt)),
  );
}
