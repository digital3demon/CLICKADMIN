/**
 * Выбор столбца в модалке «Положение на доске».
 * СТОП — не колонка доски, а отдельное действие (после подтверждения в UI).
 */
export const KANBAN_CARD_MODAL_STOP_COLUMN_ID = "__kanban_stop__";

export type KanbanPlacementColumnPick =
  | { kind: "noop" }
  | { kind: "stop" }
  | { kind: "column"; columnId: string };

export function interpretKanbanPlacementColumnPick(
  selectedId: string,
  currentColumnId: string,
): KanbanPlacementColumnPick {
  const selected = String(selectedId || "").trim();
  const current = String(currentColumnId || "").trim();
  if (!selected || selected === current) return { kind: "noop" };
  if (selected === KANBAN_CARD_MODAL_STOP_COLUMN_ID) return { kind: "stop" };
  return { kind: "column", columnId: selected };
}
