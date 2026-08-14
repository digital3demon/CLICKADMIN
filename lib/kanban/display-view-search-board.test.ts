import { describe, expect, it } from "vitest";
import {
  buildKanbanDisplayView,
  buildKaitenMirrorColumnsForBoard,
  createCard,
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
} from "@/lib/kanban/model";
import type { KanbanAppState, KanbanBoard } from "@/lib/kanban/types";

function mirrorBoard(id: string, title: string): KanbanBoard {
  return {
    id,
    title,
    columns: buildKaitenMirrorColumnsForBoard(id),
    users: [],
    cardTypes: [],
  };
}

describe("buildKanbanDisplayView · search on board", () => {
  it("does not pull matching cards from other boards", () => {
    const ortho = mirrorBoard(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия");
    const odon = mirrorBoard(KANBAN_BOARD_ORTHODONTICS_ID, "Ортодонтия");
    const approvalOrtho = ortho.columns.find((c) => c.title === "Согласование")!;
    const approvalOdon = odon.columns.find((c) => c.title === "Согласование")!;
    approvalOrtho.cards.push(
      createCard({
        id: "local-hit",
        title: "2608-007 Исеев Енькова А.А. Постоянные",
        linkedOrderId: "o1",
      }),
    );
    approvalOdon.cards.push(
      createCard({
        id: "foreign-hit",
        title: "2608-032 Соколов Накладки",
        description: "исеев в описании с чужой доски",
        linkedOrderId: "o2",
      }),
    );

    const state: KanbanAppState = {
      version: 1,
      boards: [ortho, odon],
      activeBoardId: KANBAN_BOARD_ORTHOPEDICS_ID,
      search: "исеев",
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

    const { displayBoard, cardHomeBoardId } = buildKanbanDisplayView(state, {
      sessionUserId: "me",
      sessionUserRole: "ADMIN",
    });
    const ids = displayBoard.columns.flatMap((c) => c.cards.map((x) => x.id));
    expect(ids).toContain("local-hit");
    expect(ids).not.toContain("foreign-hit");
    expect(cardHomeBoardId.get("local-hit")).toBe(KANBAN_BOARD_ORTHOPEDICS_ID);
  });

  it("прячет пустые колонки, чтобы попадание в «Сдана админам» было видно", () => {
    const ortho = mirrorBoard(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия");
    const shipped = ortho.columns.find((c) => c.title === "Сдана админам")!;
    shipped.cards.push(
      createCard({
        id: "orlov",
        title: "2608-119 Орлов Ю. Енькова А.А. Временные 13.08",
        linkedOrderId: "o-orlov",
      }),
    );
    const state: KanbanAppState = {
      version: 1,
      boards: [ortho],
      activeBoardId: KANBAN_BOARD_ORTHOPEDICS_ID,
      search: "орлов",
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
    const { displayBoard } = buildKanbanDisplayView(state, {
      sessionUserId: "me",
      sessionUserRole: "ADMIN",
    });
    expect(displayBoard.columns.map((c) => c.title)).toEqual(["Сдана админам"]);
    expect(displayBoard.columns[0]!.cards.map((c) => c.id)).toEqual(["orlov"]);
  });
});
