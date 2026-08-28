/**
 * Тип плитки → id на доске. Order хранит cuid из справочника,
 * зеркало часто ещё kt_* — склеиваем по имени.
 */
export function resolveKanbanBoardCardTypeId(
  board: { cardTypes?: Array<{ id: string; name: string }> },
  input: { cardTypeId?: string | null; cardTypeName?: string | null },
): string {
  const types = board.cardTypes || [];
  const name = String(input.cardTypeName || "").trim().toLowerCase();
  if (name) {
    const hit = types.find((t) => t.name.trim().toLowerCase() === name);
    if (hit?.id) return hit.id;
  }
  const id = String(input.cardTypeId || "").trim();
  if (id && types.some((t) => t.id === id)) return id;
  return "";
}
