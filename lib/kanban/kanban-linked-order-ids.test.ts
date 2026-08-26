import { describe, expect, it } from "vitest";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";
import { linkedOrderIdsOnKanbanBoard } from "./kanban-linked-order-ids";

describe("linkedOrderIdsOnKanbanBoard", () => {
  it("собирает linkedOrderId только с колонок, кириллица в title не мешает", () => {
    const state = {
      boards: [
        {
          id: "b",
          title: "Ортопедия",
          columns: [
            {
              id: "c",
              cards: [
                { id: "1", linkedOrderId: "ord-a" } as KanbanCard,
                { id: "2", linkedOrderId: "  " } as KanbanCard,
              ],
            },
          ],
          archivedCards: [
            { card: { id: "3", linkedOrderId: "ord-arch" } as KanbanCard },
          ],
        },
      ],
    } as KanbanAppState;
    expect(linkedOrderIdsOnKanbanBoard(state)).toEqual(["ord-a"]);
  });
});
