/**
 * Архив — общий для всех доступных досок; только поиск режет список.
 */
import { kanbanCardMatchesSearch } from "@/lib/kanban/kanban-card-search";
import type { KanbanArchivedCard, KanbanBoard } from "@/lib/kanban/types";

export function collectSharedArchivedCards(
  homes: readonly KanbanBoard[],
  search?: string,
): KanbanArchivedCard[] {
  const q = (search || "").trim();
  const seen = new Set<string>();
  const rows: KanbanArchivedCard[] = [];
  for (const home of homes) {
    for (const row of home.archivedCards || []) {
      if (!row?.card || seen.has(row.card.id)) continue;
      if (q && !kanbanCardMatchesSearch(row.card, q, home)) continue;
      seen.add(row.card.id);
      rows.push(row);
    }
  }
  return rows.sort((a, b) =>
    String(b.archivedAt).localeCompare(String(a.archivedAt)),
  );
}
