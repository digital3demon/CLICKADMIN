import { describe, expect, it } from "vitest";
import {
  CRM_DEFAULT_KANBAN_COLUMN_TITLE,
  resolveCreateOrderKanbanColumnTitle,
} from "@/lib/order-create-kanban-column";

describe("resolveCreateOrderKanbanColumnTitle", () => {
  it("пустое — «К исполнению»", () => {
    expect(resolveCreateOrderKanbanColumnTitle("")).toBe(
      CRM_DEFAULT_KANBAN_COLUMN_TITLE,
    );
    expect(resolveCreateOrderKanbanColumnTitle(null)).toBe(
      CRM_DEFAULT_KANBAN_COLUMN_TITLE,
    );
  });

  it("кириллица до и после — сохраняет столбец", () => {
    expect(resolveCreateOrderKanbanColumnTitle("  Производство  ")).toBe(
      "Производство",
    );
    expect(resolveCreateOrderKanbanColumnTitle("На проверку")).toBe(
      "На проверку",
    );
  });

  it("в форме нового заказа СТОП сохраняется", () => {
    expect(resolveCreateOrderKanbanColumnTitle("СТОП")).toBe("СТОП");
    expect(resolveCreateOrderKanbanColumnTitle("  Stop  ")).toBe("СТОП");
  });
});
