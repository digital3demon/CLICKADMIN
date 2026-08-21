import { describe, expect, it } from "vitest";
import {
  createCard,
  dedupeLinkedOrderCardsOnBoard,
  type KanbanBoard,
  type KanbanColumn,
} from "@/lib/kanban/model";

function boardWithCards(
  cols: Array<{ id: string; cards: Array<{ id: string; linkedOrderId: string }> }>,
): KanbanBoard {
  return {
    id: "b1",
    title: "Demo",
    columns: cols.map((c, i) => {
      const col = {
        id: c.id,
        title: c.id,
        wipLimit: 0,
        sortOrder: i,
        cards: c.cards.map((card) =>
          createCard({
            id: card.id,
            title: card.id,
            linkedOrderId: card.linkedOrderId,
          }),
        ),
      } as KanbanColumn;
      return col;
    }),
    cardTypes: [],
    users: [],
    labels: [],
  } as KanbanBoard;
}

describe("dedupeLinkedOrderCardsOnBoard", () => {
  it("keeps one card per linkedOrderId across columns", () => {
    const board = boardWithCards([
      {
        id: "col-a",
        cards: [
          { id: "c1", linkedOrderId: "ord-1" },
          { id: "c2", linkedOrderId: "ord-1" },
        ],
      },
      {
        id: "col-b",
        cards: [
          { id: "c3", linkedOrderId: "ord-1" },
          { id: "c4", linkedOrderId: "ord-2" },
        ],
      },
    ]);
    dedupeLinkedOrderCardsOnBoard(board);
    const all = board.columns.flatMap((c) => c.cards);
    expect(all.map((c) => c.id)).toEqual(["c1", "c4"]);
  });
});
