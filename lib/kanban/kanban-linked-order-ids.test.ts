import { describe, expect, it } from "vitest";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";
import {
  collectKanbanKaitenRefreshTargets,
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

describe("collectKanbanKaitenRefreshTargets", () => {
  it("берёт все карточки колонок и СТОП, архив пропускает, кириллица в title ок", () => {
    const state = {
      activeBoardId: "ortho",
      boards: [
        {
          id: "odon",
          title: "Ортодонтия",
          columns: [
            {
              id: "q",
              cards: [{ id: "c-odon", linkedOrderId: "ord-2", kaitenCardId: 2 }],
            },
          ],
        },
        {
          id: "ortho",
          title: "Ортопедия",
          columns: [
            {
              id: "c",
              cards: [
                { id: "c-1", linkedOrderId: "ord-a", kaitenCardId: 11 },
                { id: "c-local", title: "локальная" },
              ],
            },
          ],
          stoppedCards: [
            { card: { id: "c-stop", kaitenCardId: 99, linkedOrderId: "ord-s" } },
          ],
          archivedCards: [
            { card: { id: "c-arch", kaitenCardId: 8, linkedOrderId: "ord-arch" } },
          ],
        },
      ],
    } as unknown as KanbanAppState;
    const t = collectKanbanKaitenRefreshTargets(state, "ortho");
    expect(t.map((x) => x.cardId)).toEqual(["c-1", "c-local", "c-stop", "c-odon"]);
    expect(t.find((x) => x.cardId === "c-1")?.kaitenCardId).toBe(11);
    expect(t.find((x) => x.cardId === "c-local")?.kaitenCardId).toBeNull();
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
