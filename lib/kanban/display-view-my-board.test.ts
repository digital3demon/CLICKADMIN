import { describe, expect, it } from "vitest";
import {
  buildKanbanDisplayView,
  buildKaitenMirrorColumnsForBoard,
  createCard,
  KANBAN_BOARD_DISTRIBUTE_ID,
  KANBAN_BOARD_MY_CARDS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
} from "@/lib/kanban/model";
import type { KanbanAppState, KanbanBoard } from "@/lib/kanban/types";

function orthopedicsMirrorBoard(): KanbanBoard {
  return {
    id: KANBAN_BOARD_ORTHOPEDICS_ID,
    title: "Ортопедия",
    columns: buildKaitenMirrorColumnsForBoard(KANBAN_BOARD_ORTHOPEDICS_ID),
    users: [],
    cardTypes: [],
  };
}

describe("buildKanbanDisplayView · Мои", () => {
  it("не показывает привязанные к наряду карты без участников и ответственных", () => {
    const board = orthopedicsMirrorBoard();
    const queueCol = board.columns.find((c) => c.title === "К исполнению")!;
    queueCol.cards.push(
      createCard({
        id: "empty-team",
        title: "2605-002",
        linkedOrderId: "order-1",
        assignees: [],
        participants: [],
      }),
    );
    queueCol.cards.push(
      createCard({
        id: "as-assignee",
        title: "2605-003",
        linkedOrderId: "order-2",
        assignees: ["me"],
        participants: [],
      }),
    );
    queueCol.cards.push(
      createCard({
        id: "as-participant",
        title: "2605-004",
        linkedOrderId: "order-3",
        assignees: [],
        participants: ["me"],
      }),
    );

    const state: KanbanAppState = {
      version: 1,
      boards: [board],
      activeBoardId: KANBAN_BOARD_MY_CARDS_ID,
      search: "",
      viewMode: "list",
      calendarMonth: { y: 2026, m: 5 },
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

    const allIds = displayBoard.columns.flatMap((c) => c.cards.map((x) => x.id));
    expect(allIds).toContain("as-assignee");
    expect(allIds).toContain("as-participant");
    expect(allIds).not.toContain("empty-team");
  });

  it("в режиме «Ответственный» только карты, где пользователь в assignees", () => {
    const board = orthopedicsMirrorBoard();
    const queueCol = board.columns.find((c) => c.title === "К исполнению")!;
    queueCol.cards.push(
      createCard({
        id: "unassigned-linked",
        linkedOrderId: "order-a",
        assignees: [],
        participants: [],
      }),
    );
    queueCol.cards.push(
      createCard({
        id: "i-am-assignee",
        linkedOrderId: "order-b",
        assignees: ["me"],
        participants: [],
      }),
    );

    const state: KanbanAppState = {
      version: 1,
      boards: [board],
      activeBoardId: KANBAN_BOARD_DISTRIBUTE_ID,
      search: "",
      viewMode: "list",
      calendarMonth: { y: 2026, m: 5 },
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

    const allIds = displayBoard.columns.flatMap((c) => c.cards.map((x) => x.id));
    expect(allIds).toContain("i-am-assignee");
    expect(allIds).not.toContain("unassigned-linked");
  });
});
