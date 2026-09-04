import { describe, expect, it } from "vitest";
import {
  createCard,
  dedupeLinkedOrderCardsOnBoard,
  stripParkedLinkedOrdersFromColumns,
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

describe("stripParkedLinkedOrdersFromColumns", () => {
  it("убирает призрак архива из колонки (кириллица в oid)", () => {
    const board = boardWithCards([
      {
        id: "col-a",
        cards: [
          { id: "ghost", linkedOrderId: "наряд-архив" },
          { id: "live", linkedOrderId: "наряд-живой" },
        ],
      },
    ]);
    board.archivedCards = [
      {
        id: "arch-row",
        card: createCard({
          id: "ghost",
          title: "архив",
          linkedOrderId: "наряд-архив",
        }),
        archivedAt: "2026-09-01T00:00:00.000Z",
        deleteAfterAt: "2027-09-01T00:00:00.000Z",
        sourceColumnId: "col-a",
        sourceColumnTitle: "col-a",
        reason: "auto",
      },
    ];
    stripParkedLinkedOrdersFromColumns(board);
    expect(board.columns[0]!.cards.map((c) => c.id)).toEqual(["live"]);
    expect(board.archivedCards).toHaveLength(1);
  });

  it("убирает призрак СТОП из колонки", () => {
    const board = boardWithCards([
      {
        id: "col-a",
        cards: [{ id: "ghost-stop", linkedOrderId: "наряд-стоп" }],
      },
    ]);
    board.stoppedCards = [
      {
        id: "stop-row",
        card: createCard({
          id: "ghost-stop",
          title: "стоп",
          linkedOrderId: "наряд-стоп",
        }),
        stoppedAt: "2026-09-01T00:00:00.000Z",
        sourceColumnId: "col-a",
        sourceColumnTitle: "col-a",
      },
    ];
    stripParkedLinkedOrdersFromColumns(board);
    expect(board.columns[0]!.cards).toHaveLength(0);
  });
});
