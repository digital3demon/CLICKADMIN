import { describe, expect, it } from "vitest";
import {
  parseKanbanChecklistJson,
  slimKanbanChecklist,
} from "@/lib/kanban/kanban-linked-checklist";

describe("kanban-linked-checklist", () => {
  it("режет текст с кириллицей до и после пункта", () => {
    const slim = slimKanbanChecklist([
      {
        id: "c-примерка",
        text: "примерка Тындик — верх",
        completed: true,
        completedAt: "2026-08-31T10:00:00.000Z",
        assigneeId: "u-юля",
      },
    ]);
    expect(slim[0]?.text).toBe("примерка Тындик — верх");
    expect(slim[0]?.assigneeId).toBe("u-юля");
  });

  it("null из БД — ещё не писали, пустой массив — очистили", () => {
    expect(parseKanbanChecklistJson(null)).toBeNull();
    expect(parseKanbanChecklistJson([])).toEqual([]);
    expect(
      parseKanbanChecklistJson([
        { id: "c1", text: "сканы Жеребцов", completed: false },
      ]),
    ).toEqual([
      {
        id: "c1",
        text: "сканы Жеребцов",
        completed: false,
        completedAt: null,
        assigneeId: null,
      },
    ]);
  });
});
