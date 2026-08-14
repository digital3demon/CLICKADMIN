import { describe, expect, it } from "vitest";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";
import {
  applyKaitenPositionToKanbanState,
  resolveKanbanColumnByKaitenTitle,
} from "@/lib/kanban/kaiten-position-to-kanban";
import {
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
    trackLane: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function miniState(): KanbanAppState {
  return {
    version: 3,
    activeBoardId: "b1",
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
        id: "b1",
        title: "Ортопедия",
        columns: [
          {
            id: "c-queue",
            title: "К исполнению",
            cards: [
              card({
                id: "card-a",
                linkedOrderId: "ord-a",
                kaitenCardId: 1,
                kaitenCardSortOrder: 10,
              }),
            ],
          },
          {
            id: "c-prod",
            title: "Производство",
            cards: [
              card({
                id: "card-b",
                linkedOrderId: "ord-b",
                kaitenCardId: 2,
                kaitenCardSortOrder: 5,
              }),
            ],
          },
        ],
        users: [],
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

describe("resolveKanbanColumnByKaitenTitle", () => {
  it("matches production column by title", () => {
    const board = miniState().boards[0]!;
    expect(resolveKanbanColumnByKaitenTitle(board, "Производство").id).toBe(
      "c-prod",
    );
  });
});

describe("applyKaitenPositionToKanbanState", () => {
  it("moves card to kaiten column and updates sort order", () => {
    const state = miniState();
    const changed = applyKaitenPositionToKanbanState(state, "ord-a", {
      columnTitle: "Производство",
      sortOrder: 3,
    });
    expect(changed).toBe(true);
    const queue = state.boards[0]!.columns[0]!;
    const prod = state.boards[0]!.columns[1]!;
    expect(queue.cards.some((c) => c.id === "card-a")).toBe(false);
    expect(prod.cards.some((c) => c.id === "card-a")).toBe(true);
    expect(prod.cards.find((c) => c.id === "card-a")!.kaitenCardSortOrder).toBe(
      3,
    );
  });

  it("reorders within same column by sort_order", () => {
    const state = miniState();
    state.boards[0]!.columns[1]!.cards.push(
      card({
        id: "card-c",
        linkedOrderId: "ord-c",
        kaitenCardId: 3,
        kaitenCardSortOrder: 20,
      }),
    );
    applyKaitenPositionToKanbanState(state, "ord-c", {
      columnTitle: "Производство",
      sortOrder: 1,
    });
    const ids = state.boards[0]!.columns[1]!.cards.map((c) => c.id);
    expect(ids[0]).toBe("card-c");
    expect(ids[1]).toBe("card-b");
  });

  it("returns false when already aligned", () => {
    const state = miniState();
    expect(
      applyKaitenPositionToKanbanState(state, "ord-b", {
        columnTitle: "Производство",
        sortOrder: 5,
      }),
    ).toBe(false);
  });

  it("moves card to orthodontics board when Kaiten trackLane is ORTHODONTICS", () => {
    const state = miniState();
    state.boards[0]!.id = KANBAN_BOARD_ORTHOPEDICS_ID;
    state.boards.push({
      ...state.boards[0]!,
      id: KANBAN_BOARD_ORTHODONTICS_ID,
      title: "Ортодонтия",
      columns: [
        {
          id: "odon-queue",
          title: "К исполнению",
          cards: [],
        },
        {
          id: "odon-prod",
          title: "Производство",
          cards: [],
        },
      ],
    });
    const changed = applyKaitenPositionToKanbanState(state, "ord-b", {
      columnTitle: "Производство",
      sortOrder: 5,
      trackLane: "ORTHODONTICS",
    });
    expect(changed).toBe(true);
    const loc = findCardByLinkedOrderId(state, "ord-b")!;
    expect(state.boards[loc.boardIndex]!.id).toBe(KANBAN_BOARD_ORTHODONTICS_ID);
    expect(
      state.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!
        .trackLane,
    ).toBe("ORTHODONTICS");
  });
});
