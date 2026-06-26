import { KANBAN_STATE_KEY, kanbanBoardsFromState } from "@/lib/kanban-tenant-state-snippet-for-order";

export type KanbanColumnCatalogEntry = {
  boardId: string;
  boardTitle: string;
  columnId: string;
  title: string;
  orderIndex: number;
};

export function buildKanbanColumnCatalog(
  rawState: unknown,
): KanbanColumnCatalogEntry[] {
  const boards = kanbanBoardsFromState(rawState);
  const entries: KanbanColumnCatalogEntry[] = [];
  const seen = new Set<string>();

  for (const board of boards) {
    const boardId = (board.id || "").trim();
    const boardTitle = (board.title || "").trim() || "Доска";
    const cols = board.columns || [];
    cols.forEach((col, orderIndex) => {
      const columnId = (col.id || "").trim();
      const title = (col.title || "").trim();
      if (!title) return;
      const key = `${boardId}\0${columnId}\0${title}`;
      if (seen.has(key)) return;
      seen.add(key);
      entries.push({
        boardId,
        boardTitle,
        columnId,
        title,
        orderIndex,
      });
    });
  }

  entries.sort((a, b) => {
    const bt = a.boardTitle.localeCompare(b.boardTitle, "ru");
    if (bt !== 0) return bt;
    return a.orderIndex - b.orderIndex;
  });

  return entries;
}

export { KANBAN_STATE_KEY };

export function catalogLabel(entry: KanbanColumnCatalogEntry): string {
  return `${entry.boardTitle} / ${entry.title}`;
}

export function columnRefFromCatalogEntry(
  entry: KanbanColumnCatalogEntry,
): {
  mode: "column";
  boardId: string;
  columnId: string;
  title: string;
} {
  return {
    mode: "column",
    boardId: entry.boardId,
    columnId: entry.columnId,
    title: entry.title,
  };
}