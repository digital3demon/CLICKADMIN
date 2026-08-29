/**
 * Сохранённые шаблоны фильтров канбана.
 * Быстрый доступ в панели — первые 4; остальные только в «Фильтры».
 */
import type { KanbanFilterTemplate, KanbanFilters, KanbanPeopleJoin } from "@/lib/kanban/types";

export const KANBAN_FILTER_QUICK_ACCESS_MAX = 4;

export function kanbanPeopleJoin(f: KanbanFilters): KanbanPeopleJoin {
  return f.peopleJoin === "or" ? "or" : "and";
}

export function kanbanFiltersEqual(a: KanbanFilters, b: KanbanFilters): boolean {
  return (
    String(a.cardTypeId || "") === String(b.cardTypeId || "") &&
    String(a.due || "") === String(b.due || "") &&
    String(a.assigneeUserId || "") === String(b.assigneeUserId || "") &&
    String(a.participantUserId || "") === String(b.participantUserId || "") &&
    kanbanPeopleJoin(a) === kanbanPeopleJoin(b)
  );
}

export function quickAccessKanbanFilterTemplates(
  templates: readonly KanbanFilterTemplate[] | null | undefined,
): KanbanFilterTemplate[] {
  return (templates ?? []).slice(0, KANBAN_FILTER_QUICK_ACCESS_MAX);
}
