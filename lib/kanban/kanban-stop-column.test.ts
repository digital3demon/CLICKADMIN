import { describe, expect, it } from "vitest";
import { isKanbanStopColumnTitle } from "@/lib/kanban/kanban-stop-column";

describe("isKanbanStopColumnTitle", () => {
  it("распознаёт СТОП из Kaiten и CRM, кириллица вокруг не ломает trim", () => {
    expect(isKanbanStopColumnTitle("СТОП")).toBe(true);
    expect(isKanbanStopColumnTitle("  стоп  ")).toBe(true);
    expect(isKanbanStopColumnTitle("Стоп")).toBe(true);
    expect(isKanbanStopColumnTitle("СТОП / пауза")).toBe(true);
    expect(isKanbanStopColumnTitle("Stop")).toBe(true);
  });

  it("не путает с рабочими колонками", () => {
    expect(isKanbanStopColumnTitle("К исполнению")).toBe(false);
    expect(isKanbanStopColumnTitle("Производство")).toBe(false);
    expect(isKanbanStopColumnTitle("")).toBe(false);
    expect(isKanbanStopColumnTitle(null)).toBe(false);
  });
});
