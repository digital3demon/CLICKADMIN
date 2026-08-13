import { describe, expect, it } from "vitest";
import {
  findHandedToAdminsColumnIndex,
  peekLinkedOrderColumnNeighbor,
} from "@/lib/kanban/advance-linked-order-column";
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
