import { describe, expect, it } from "vitest";
import type { KanbanFilterTemplate, KanbanFilters } from "@/lib/kanban/types";
import {
  kanbanFiltersEqual,
  quickAccessKanbanFilterTemplates,
} from "@/lib/kanban/filter-templates";

function filters(partial: Partial<KanbanFilters> = {}): KanbanFilters {
  return {
    cardTypeId: "",
    due: "",
    assigneeUserId: "",
    participantUserId: "",
    ...partial,
  };
}

describe("quickAccessKanbanFilterTemplates", () => {
  it("первые 4, кириллица в названии до и после лимита", () => {
    const templates: KanbanFilterTemplate[] = [
      { id: "1", name: "Срочные Перчак", filters: filters({ due: "urgent" }) },
      { id: "2", name: "Юля ответственный", filters: filters({ assigneeUserId: "u-юля" }) },
      { id: "3", name: "Без срока", filters: filters({ due: "none" }) },
      { id: "4", name: "На неделе", filters: filters({ due: "week" }) },
      { id: "5", name: "пятый Шубина не в панели", filters: filters({ due: "today" }) },
    ];
    const quick = quickAccessKanbanFilterTemplates(templates);
    expect(quick.map((t) => t.id)).toEqual(["1", "2", "3", "4"]);
    expect(quick.map((t) => t.name)).toEqual([
      "Срочные Перчак",
      "Юля ответственный",
      "Без срока",
      "На неделе",
    ]);
    expect(quick.some((t) => t.name.includes("Шубина"))).toBe(false);
  });
});

describe("kanbanFiltersEqual", () => {
  it("peopleJoin по умолчанию «и», кириллица в id пользователя", () => {
    expect(
      kanbanFiltersEqual(
        filters({ due: "overdue", assigneeUserId: "u-юля" }),
        filters({ due: "overdue", assigneeUserId: "u-юля", peopleJoin: "and" }),
      ),
    ).toBe(true);
    expect(
      kanbanFiltersEqual(
        filters({ assigneeUserId: "u-юля", participantUserId: "u-саша", peopleJoin: "or" }),
        filters({ assigneeUserId: "u-юля", participantUserId: "u-саша", peopleJoin: "and" }),
      ),
    ).toBe(false);
  });
});
