import type { KanbanBoard, KanbanStoppedCard } from "@/lib/kanban/types";

function resolveStopViewColumnId(
  viewBoard: KanbanBoard,
  row: KanbanStoppedCard,
): string | null {
  const byId = viewBoard.columns.find((c) => c.id === row.sourceColumnId);
  if (byId) return byId.id;
  const titleNorm = row.sourceColumnTitle.trim().toLowerCase();
  if (titleNorm) {
    const byTitle = viewBoard.columns.find(
      (c) => c.title.trim().toLowerCase() === titleNorm,
    );
    if (byTitle) return byTitle.id;
  }
  return viewBoard.columns[0]?.id ?? null;
}

/** Виртуальная доска для режима СТОП: карточки в колонках, откуда их сняли. */
export function buildKanbanStopViewBoard(
  viewBoard: KanbanBoard,
  stoppedRows: readonly KanbanStoppedCard[],
): KanbanBoard {
  const cardsByColumn = new Map<string, KanbanBoard["columns"][number]["cards"]>();
  for (const col of viewBoard.columns) {
    cardsByColumn.set(col.id, []);
  }
  for (const row of stoppedRows) {
    const colId = resolveStopViewColumnId(viewBoard, row);
    if (!colId) continue;
    const list = cardsByColumn.get(colId);
    if (list) list.push(row.card);
  }
  return {
    ...viewBoard,
    columns: viewBoard.columns.map((col) => ({
      ...col,
      cards: cardsByColumn.get(col.id) ?? [],
    })),
  };
}
