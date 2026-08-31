/**
 * Чеклист linked-карточки — общее поле наряда (все сотрудники видят одно).
 * Не tenant JSON (linked режутся) и не localStorage.
 */
import type { ChecklistItem } from "@/lib/kanban/types";

export const KANBAN_CHECKLIST_CAP = 60;

export function slimKanbanChecklist(
  items: readonly ChecklistItem[] | null | undefined,
): ChecklistItem[] {
  return (items || []).slice(0, KANBAN_CHECKLIST_CAP).map((row) => ({
    id: String(row.id || ""),
    text: String(row.text || "").slice(0, 400),
    completed: Boolean(row.completed),
    completedAt: row.completedAt ?? null,
    assigneeId: row.assigneeId ?? null,
  }));
}

/** null — в БД ещё не писали; [] — чеклист очистили. */
export function parseKanbanChecklistJson(raw: unknown): ChecklistItem[] | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    try {
      return parseKanbanChecklistJson(JSON.parse(t));
    } catch {
      return null;
    }
  }
  if (!Array.isArray(raw)) return null;
  return slimKanbanChecklist(
    raw.filter((x): x is ChecklistItem => Boolean(x && typeof x === "object")),
  );
}
