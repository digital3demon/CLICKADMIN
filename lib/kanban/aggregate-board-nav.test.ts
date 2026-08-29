import { describe, expect, it } from "vitest";
import {
  boardIdAfterLeavingKanbanAggregate,
  KANBAN_BOARD_MY_CARDS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
} from "@/lib/kanban/model";

describe("boardIdAfterLeavingKanbanAggregate", () => {
  it("возвращает последнюю доску пользователя, даже если это не ортопедия", () => {
    expect(
      boardIdAfterLeavingKanbanAggregate("kanban-board-клиника-юли", [
        KANBAN_BOARD_ORTHOPEDICS_ID,
        "kanban-board-клиника-юли",
      ]),
    ).toBe("kanban-board-клиника-юли");
  });

  it("не подставляет ортопедию, если своей доски нет", () => {
    expect(
      boardIdAfterLeavingKanbanAggregate("", [
        KANBAN_BOARD_ORTHOPEDICS_ID,
        "kanban-board-клиника-юли",
      ]),
    ).toBeNull();
    expect(
      boardIdAfterLeavingKanbanAggregate(KANBAN_BOARD_MY_CARDS_ID, [
        KANBAN_BOARD_ORTHOPEDICS_ID,
      ]),
    ).toBeNull();
  });
});
