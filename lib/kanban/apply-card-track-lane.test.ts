import { describe, expect, it } from "vitest";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";
import {
  applyKanbanCardTrackLaneChange,
  kanbanBoardIdForTrackLane,
} from "@/lib/kanban/apply-card-track-lane";
import {
  KANBAN_BOARD_MY_CARDS_ID,
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
} from "@/lib/kanban/model";
import { findCardByLinkedOrderId } from "@/lib/kanban/chat-sync";

function card(partial: Partial<KanbanCard> & { id: string }): KanbanCard {
  return {
    title: partial.title ?? partial.id,
    description: "",
    cardTypeId: "",
    assignees: [],
    participants: [],
    dueDate: "",
    urgent: false,
    checklist: [],
    files: [],
    comments: [],
    activity: [],
    blocked: false,
    blockReason: "",
    blockedByUserId: "",
    blockedAt: "",
    createdByUserId: "u1",
    lastMovedAt: null,
    trackLane: "ORTHOPEDICS",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function dualState(): KanbanAppState {
  return {
    version: 3,
    activeBoardId: KANBAN_BOARD_ORTHOPEDICS_ID,
    search: "",
    filters: {
      cardTypeId: "",
      assigneeId: "",
      due: "",
      hasBlock: false,
    },
    filterTemplates: [],
    viewMode: "board",
    calendarMonth: { y: 2026, m: 6 },
    boards: [
      {
        id: KANBAN_BOARD_ORTHOPEDICS_ID,
        title: "Ортопедия",
        columns: [
          {
            id: "ortho-prod",
            title: "Производство",
            cards: [
              card({
                id: "card-splint",
                linkedOrderId: "ord-splint",
                kaitenCardId: 68260442,
                trackLane: "ORTHOPEDICS",
              }),
            ],
          },
        ],
        users: [{ id: "u1", name: "Всеволод" }],
        cardTypes: [],
        automations: [],
        autoArchiveRules: [],
        archiveRetentionDays: 365,
        archivedCards: [],
        stoppedCards: [],
      },
      {
        id: KANBAN_BOARD_ORTHODONTICS_ID,
        title: "Ортодонтия",
        columns: [
          {
            id: "odon-prod",
            title: "Производство",
            cards: [],
          },
        ],
        users: [{ id: "u1", name: "Всеволод" }],
        cardTypes: [],
        automations: [],
        autoArchiveRules: [],
        archiveRetentionDays: 365,
        archivedCards: [],
        stoppedCards: [],
      },
    ],
  } as KanbanAppState;
}

describe("applyKanbanCardTrackLaneChange", () => {
  it("moves linked card from orthopedics to orthodontics and keeps column title", () => {
    const state = dualState();
    const res = applyKanbanCardTrackLaneChange(state, "card-splint", "ORTHODONTICS", {
      activityUserId: "u1",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.columnTitle).toBe("Производство");
    const loc = findCardByLinkedOrderId(state, "ord-splint")!;
    expect(state.boards[loc.boardIndex]!.id).toBe(KANBAN_BOARD_ORTHODONTICS_ID);
    const moved =
      state.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!;
    expect(moved.trackLane).toBe("ORTHODONTICS");
    expect(state.activeBoardId).toBe(KANBAN_BOARD_ORTHODONTICS_ID);
    expect(
      state.boards
        .find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!
        .columns[0]!.cards.some((c) => c.id === "card-splint"),
    ).toBe(false);
  });

  it("keeps aggregate board selected", () => {
    const state = dualState();
    state.activeBoardId = KANBAN_BOARD_MY_CARDS_ID;
    applyKanbanCardTrackLaneChange(state, "card-splint", "ORTHODONTICS", {
      activityUserId: "u1",
    });
    expect(state.activeBoardId).toBe(KANBAN_BOARD_MY_CARDS_ID);
  });

  it("returns false when already on that board", () => {
    const state = dualState();
    expect(
      applyKanbanCardTrackLaneChange(state, "card-splint", "ORTHOPEDICS", {
        activityUserId: "u1",
      }).ok,
    ).toBe(false);
  });
});

describe("kanbanBoardIdForTrackLane", () => {
  it("maps orthodontics", () => {
    expect(kanbanBoardIdForTrackLane("ORTHODONTICS")).toBe(
      KANBAN_BOARD_ORTHODONTICS_ID,
    );
  });
});
