import { describe, expect, it } from "vitest";
import { visibleIndexToFullInsertIndex } from "@/lib/kanban/board-visible-cards";
import { createCard, defaultAppState } from "@/lib/kanban/model";
import type { KanbanBoard, KanbanColumn } from "@/lib/kanban/types";

describe("visibleIndexToFullInsertIndex · фильтр", () => {
  it("вставка среди видимых не задевает скрытые, кириллица в id", () => {
    const state = defaultAppState();
    state.filters.assigneeUserId = "u-всеволод";
    const board = state.boards[0]!;
    const col: KanbanColumn = {
      id: "col-согласование",
      title: "Согласование",
      cards: [
        createCard({ id: "скрытая-шубина", title: "Шубина", assignees: ["u-олег"] }),
        createCard({ id: "видимая-перчак", title: "Перчак", assignees: ["u-всеволод"] }),
        createCard({ id: "скрытая-невский", title: "Невский", assignees: ["u-олег"] }),
        createCard({ id: "видимая-рясная", title: "Рясная", assignees: ["u-всеволод"] }),
      ],
    };
    const resolve = (_card: { id: string }) => board as KanbanBoard;
    /* После первой видимой — перед второй видимой, индекс в полной колонке = 3. */
    expect(visibleIndexToFullInsertIndex(col, 1, state, resolve)).toBe(3);
    expect(visibleIndexToFullInsertIndex(col, 2, state, resolve)).toBe(4);
  });
});
