import { describe, expect, it } from "vitest";
import {
  defaultAppState,
  KANBAN_BOARD_ORTHOPEDICS_ID,
  slimKanbanStateForClientState,
} from "@/lib/kanban/model";
import { clientStatePayloadTooLarge } from "@/lib/client-state-limits";
import type { KanbanAppState } from "@/lib/kanban/types";

describe("slimKanbanStateForClientState", () => {
  it("strips data: URLs from files but keeps attachment API paths", () => {
    const base = structuredClone(defaultAppState()) as KanbanAppState;
    const ortho = base.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!;
    const col0 = ortho.columns[0]!;
    const bigData = `data:image/png;base64,${"A".repeat(500_000)}`;
    col0.cards = [
      {
        id: "c1",
        title: "t",
        description: "x".repeat(800),
        cardTypeId: "",
        assignees: [],
        participants: [],
        dueDate: "",
        urgent: false,
        checklist: [],
        files: [
          {
            id: "f1",
            name: "shot.png",
            mime: "image/png",
            size: 1000,
            dataUrl: bigData,
            addedAt: "2026-01-01T00:00:00.000Z",
            addedByUserId: "u1",
          },
          {
            id: "f2",
            name: "a.pdf",
            mime: "application/pdf",
            size: 10,
            dataUrl: "/api/orders/ord1/attachments/att1",
            addedAt: "2026-01-01T00:00:00.000Z",
            addedByUserId: "u1",
          },
        ],
        comments: Array.from({ length: 60 }, (_, i) => ({
          id: `cm${i}`,
          userId: "u1",
          text: "c".repeat(500),
          createdAt: "2026-01-01T00:00:00.000Z",
        })),
        activity: Array.from({ length: 40 }, (_, i) => ({
          id: `a${i}`,
          type: "move",
          text: "moved",
          userId: "u1",
          at: "2026-01-01T00:00:00.000Z",
        })),
        blocked: false,
        blockReason: "",
        blockedByUserId: "",
        blockedAt: "",
        createdByUserId: "u1",
        lastMovedAt: null,
        trackLane: "",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const before = clientStatePayloadTooLarge("tenant", "kanbanAppStateV3", base);
    expect(before.tooLarge).toBe(true);

    const slim = slimKanbanStateForClientState(base);
    const card = slim.boards
      .find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!
      .columns[0]!.cards[0]!;

    expect(card.files[0]!.dataUrl).toBe("");
    expect(card.files[1]!.dataUrl).toBe("/api/orders/ord1/attachments/att1");
    expect(card.description.length).toBeLessThanOrEqual(401);
    expect(card.comments).toHaveLength(40);
    expect(card.comments.every((c) => c.text.length <= 281)).toBe(true);
    expect(card.activity).toHaveLength(15);

    const after = clientStatePayloadTooLarge("tenant", "kanbanAppStateV3", slim);
    expect(after.tooLarge).toBe(false);
  });
});
