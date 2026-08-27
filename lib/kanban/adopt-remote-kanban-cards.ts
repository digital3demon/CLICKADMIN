import type { KanbanAppState, KanbanBoard, KanbanColumn } from "@/lib/kanban/types";

function colKey(col: KanbanColumn): string {
  return `${col.id}\0${String(col.title || "").trim().toLowerCase()}`;
}

function matchRemoteColumn(
  local: KanbanColumn,
  remote: KanbanBoard,
): KanbanColumn | null {
  const byId = remote.columns.find((c) => c.id === local.id);
  if (byId) return byId;
  const title = String(local.title || "").trim().toLowerCase();
  if (!title) return null;
  return (
    remote.columns.find(
      (c) => String(c.title || "").trim().toLowerCase() === title,
    ) ?? null
  );
}

/**
 * Справочник правит заголовки досок/колонок; карточки берём с живого tenant-снимка,
 * чтобы debounce 450 мс не затирал ходы канбана.
 */
export function adoptRemoteKanbanCards(
  local: KanbanAppState,
  remote: KanbanAppState,
): KanbanAppState {
  const next = structuredClone(local);
  const remoteById = new Map(remote.boards.map((b) => [b.id, b]));
  for (const board of next.boards) {
    const rb = remoteById.get(board.id);
    if (!rb) continue;
    const seenRemote = new Set<string>();
    for (const col of board.columns) {
      const rc = matchRemoteColumn(col, rb);
      if (!rc) continue;
      col.cards = structuredClone(rc.cards);
      seenRemote.add(colKey(rc));
    }
    board.archivedCards = structuredClone(rb.archivedCards || []);
    board.stoppedCards = structuredClone(rb.stoppedCards || []);
    void seenRemote;
  }
  return next;
}
