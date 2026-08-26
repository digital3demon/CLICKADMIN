import { describe, expect, it } from "vitest";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";
import {
  linkedOrderIdsOnKanbanBoard,
  nextLinkedOrderIdPage,
} from "./kanban-linked-order-ids";

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

describe("nextLinkedOrderIdPage", () => {
  it("страницы по id, кириллица в соседних данных не нужна", () => {
    const ids = ["ord-б", "ord-а", "ord-в"];
    const first = nextLinkedOrderIdPage(ids, null, 2);
    expect(first.page).toEqual(["ord-а", "ord-б"]);
    expect(first.finished).toBe(false);
    const second = nextLinkedOrderIdPage(ids, first.page[1], 2);
    expect(second.page).toEqual(["ord-в"]);
    expect(second.finished).toBe(true);
    expect(nextLinkedOrderIdPage(ids, "ord-в", 2)).toEqual({
      page: [],
      finished: true,
    });
  });
});
