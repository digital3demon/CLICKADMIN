import { describe, expect, it } from "vitest";
import {
  applyKaitenApiCardTypesToMirrorBoards,
  buildKaitenMirrorColumnsForBoard,
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
});
