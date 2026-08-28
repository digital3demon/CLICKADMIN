import { describe, expect, it } from "vitest";
import {
  applyKaitenApiCardTypesToMirrorBoards,
  buildKaitenMirrorColumnsForBoard,
  createCard,
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
} from "@/lib/kanban/model";
import type { KanbanAppState, KanbanBoard } from "@/lib/kanban/types";

function board(id: string, title: string): KanbanBoard {
  return {
    id,
    title,
    columns: buildKaitenMirrorColumnsForBoard(id),
    users: [],
    cardTypes: [
      {
        id: "kt_spl",
        name: "Сплинт",
        color: "#3b82f6",
        sortOrder: 90,
        defaultTrackLane: "ORTHOPEDICS",
      },
    ],
  };
}

describe("applyKaitenApiCardTypesToMirrorBoards", () => {
  it("keeps default space after Kaiten id swap", () => {
    const state: KanbanAppState = {
      version: 1,
      boards: [
        board(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия"),
        board(KANBAN_BOARD_ORTHODONTICS_ID, "Ортодонтия"),
      ],
      activeBoardId: KANBAN_BOARD_ORTHOPEDICS_ID,
      search: "",
      viewMode: "board",
      calendarMonth: { y: 2026, m: 8 },
      filters: {
        cardTypeId: "",
        due: "",
        assigneeUserId: "",
        participantUserId: "",
      },
      filterTemplates: [],
    };
    const next = applyKaitenApiCardTypesToMirrorBoards(state, [
      { id: "cuid-from-erp", name: "Сплинт", sortOrder: 90 },
    ]);
    const splint = next.boards
      .find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!
      .cardTypes.find((t) => t.name === "Сплинт");
    expect(splint?.id).toBe("cuid-from-erp");
    expect(splint?.defaultTrackLane).toBe("ORTHOPEDICS");
  });

  it("каталог добавляет «Моделировка», не выкидывая «Модели»", () => {
    const state: KanbanAppState = {
      version: 1,
      boards: [
        {
          ...board(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия"),
          cardTypes: [
            {
              id: "kt_mod",
              name: "Модели",
              color: "#92400e",
              sortOrder: 30,
              defaultTrackLane: "ORTHOPEDICS",
            },
          ],
          columns: [
            {
              id: "col-1",
              title: "К исполнению",
              cards: [
                createCard({
                  id: "c1",
                  title: "2607-438 Пехконен",
                  cardTypeId: "kt_mod",
                }),
              ],
            },
          ],
        },
        board(KANBAN_BOARD_ORTHODONTICS_ID, "Ортодонтия"),
      ],
      activeBoardId: KANBAN_BOARD_ORTHOPEDICS_ID,
      search: "",
      viewMode: "board",
      calendarMonth: { y: 2026, m: 8 },
      filters: {
        cardTypeId: "",
        due: "",
        assigneeUserId: "",
        participantUserId: "",
      },
      filterTemplates: [],
    };
    const next = applyKaitenApiCardTypesToMirrorBoards(state, [
      { id: "cuid-модели", name: "Модели", sortOrder: 30 },
      { id: "cuid-модровка", name: "Моделировка", sortOrder: 120 },
    ]);
    const types = next.boards[0]!.cardTypes;
    expect(types.some((t) => t.name === "Модели" && t.id === "cuid-модели")).toBe(
      true,
    );
    expect(types.some((t) => t.name === "Моделировка")).toBe(true);
    const card = next.boards[0]!.columns[0]!.cards[0]!;
    expect(card.cardTypeId).toBe("cuid-модели");
  });
});
