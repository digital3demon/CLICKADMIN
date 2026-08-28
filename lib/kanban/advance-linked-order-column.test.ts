import { describe, expect, it } from "vitest";
import {
  columnTitleAfterWorkUnsent,
  findHandedToAdminsColumnIndex,
  findKanbanColumnIndexByTitle,
  findLinkedOrderCardOnSourceBoard,
  peekLinkedOrderColumnNeighbor,
  snapshotColumnBeforeWorkSent,
} from "@/lib/kanban/advance-linked-order-column";
import { KANBAN_BOARD_MY_CARDS_ID } from "@/lib/kanban/model";
import type { KanbanAppState, KanbanBoard } from "@/lib/kanban/types";

function boardWithColumns(
  titles: string[],
  orderId: string,
  columnIndex: number,
): KanbanBoard {
  return {
    id: "b1",
    title: "Ортопедия",
    columns: titles.map((title, i) => ({
      id: `c${i}`,
      title,
      cards:
        i === columnIndex
          ? [
              {
                id: "card-1",
                title: "t",
                linkedOrderId: orderId,
                kaitenCardId: 42,
              },
            ]
          : [],
    })),
    users: [],
    cardTypes: [],
    automations: [],
  } as unknown as KanbanBoard;
}

describe("peekLinkedOrderColumnNeighbor", () => {
  it("returns current and next titles", () => {
    const state = {
      boards: [
        boardWithColumns(["Очередь", "Производство", "Сборка"], "ord-1", 1),
      ],
      activeBoardId: "b1",
    } as KanbanAppState;
    const n = peekLinkedOrderColumnNeighbor(state, "ord-1");
    expect(n?.currentTitle).toBe("Производство");
    expect(n?.nextTitle).toBe("Сборка");
    expect(n?.isLast).toBe(false);
    expect(n?.kaitenCardId).toBe(42);
  });

  it("marks last column", () => {
    const state = {
      boards: [boardWithColumns(["A", "B"], "ord-1", 1)],
      activeBoardId: "b1",
    } as KanbanAppState;
    const n = peekLinkedOrderColumnNeighbor(state, "ord-1");
    expect(n?.isLast).toBe(true);
    expect(n?.nextTitle).toBeNull();
  });
});

describe("findHandedToAdminsColumnIndex", () => {
  it("matches by title", () => {
    expect(
      findHandedToAdminsColumnIndex([
        { id: "a", title: "Производство" },
        { id: "b", title: "Сдана админам" },
      ]),
    ).toBe(1);
  });

  it("matches by col_shipped suffix", () => {
    expect(
      findHandedToAdminsColumnIndex([
        { id: "kanban_board_orthopedics_col_prod", title: "Производство" },
        {
          id: "kanban_board_orthopedics_col_shipped",
          title: "Готово",
        },
      ]),
    ).toBe(1);
  });

  it("returns -1 when missing", () => {
    expect(
      findHandedToAdminsColumnIndex([{ id: "a", title: "Производство" }]),
    ).toBe(-1);
  });
});

describe("findKanbanColumnIndexByTitle", () => {
  it("находит производство по кириллице", () => {
    expect(
      findKanbanColumnIndexByTitle(
        [
          { id: "a", title: "К исполнению" },
          { id: "b", title: "Производство" },
        ],
        "Производство",
      ),
    ).toBe(1);
  });

  it("сдана админам — и по «Сдано админам»", () => {
    expect(
      findKanbanColumnIndexByTitle(
        [
          { id: "a", title: "Сборка" },
          { id: "b", title: "Сдано админам" },
        ],
        "Сдана админам",
      ),
    ).toBe(1);
  });
});

describe("snapshotColumnBeforeWorkSent / columnTitleAfterWorkUnsent", () => {
  it("запоминает колонку до отправки и возвращает её при снятии", () => {
    expect(snapshotColumnBeforeWorkSent("Производство", null)).toBe(
      "Производство",
    );
    expect(columnTitleAfterWorkUnsent("Производство", "Сдана админам")).toBe(
      "Производство",
    );
  });

  it("не затирает снимок, если карточка уже в сдана админам", () => {
    expect(
      snapshotColumnBeforeWorkSent("Сдана админам", "Сборка Иванова"),
    ).toBe("Сборка Иванова");
  });

  it("без снимка откатывает в к исполнению, не оставляя сдана админам", () => {
    expect(columnTitleAfterWorkUnsent(null, "Сдана админам")).toBe(
      "К исполнению",
    );
  });
});

describe("findLinkedOrderCardOnSourceBoard", () => {
  it("не берёт карточку с виртуальной доски «Мои»", () => {
    const state = {
      boards: [
        {
          id: KANBAN_BOARD_MY_CARDS_ID,
          title: "Мои",
          columns: [
            {
              id: "my-prod",
              title: "Производство",
              cards: [
                {
                  id: "my-card",
                  title: "2608-361 Сынгаевская",
                  linkedOrderId: "ord-1",
                },
              ],
            },
          ],
          users: [],
          cardTypes: [],
          automations: [],
        },
        boardWithColumns(["Производство", "Сдана админам"], "ord-1", 0),
      ],
      activeBoardId: "b1",
    } as KanbanAppState;
    const loc = findLinkedOrderCardOnSourceBoard(state, "ord-1");
    expect(loc?.boardIndex).toBe(1);
    expect(state.boards[loc!.boardIndex]!.id).toBe("b1");
  });
});
