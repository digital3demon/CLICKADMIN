import { describe, expect, it } from "vitest";
import type { KanbanAppState } from "@/lib/kanban/types";
import { applyPendingKanbanColumnMoves } from "./pending-column-moves";

function boardState(): KanbanAppState {
  return {
    boards: [
      {
        id: "b1",
        title: "Ортопедия",
        columns: [
          {
            id: "col-todo",
            title: "К исполнению",
            cards: [
              {
                id: "card-191",
                title: "2608-191 Жеребцов",
                linkedOrderId: "ord-191",
              },
            ],
          },
          {
            id: "col-agree",
            title: "Согласование",
            cards: [],
          },
        ],
      },
    ],
    activeBoardId: "b1",
    users: [],
    labels: [],
    filters: {},
  } as unknown as KanbanAppState;
}

describe("applyPendingKanbanColumnMoves", () => {
  it("переносит карточку в колонку по кириллическому названию", () => {
    const next = applyPendingKanbanColumnMoves(boardState(), [
      {
        cardId: "card-191",
        orderId: "ord-191",
        toColumnTitle: "Согласование",
        at: Date.now(),
      },
    ]);
    const todo = next.boards[0]!.columns.find((c) => c.id === "col-todo");
    const agree = next.boards[0]!.columns.find((c) => c.id === "col-agree");
    expect(todo?.cards.map((c) => c.id)).toEqual([]);
    expect(agree?.cards.map((c) => c.id)).toEqual(["card-191"]);
  });

  it("не двигает, если колонка та же", () => {
    const start = boardState();
    const next = applyPendingKanbanColumnMoves(start, [
      {
        cardId: "card-191",
        toColumnId: "col-todo",
        at: Date.now(),
      },
    ]);
    expect(next.boards[0]!.columns[0]!.cards[0]!.id).toBe("card-191");
  });
});
