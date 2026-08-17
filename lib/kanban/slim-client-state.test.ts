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
    const bigData = `data:image/png;base64,${"A".repeat(700_000)}`;
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
    expect(card.description.length).toBeLessThanOrEqual(121);
    expect(card.comments).toHaveLength(0);
    expect(card.activity).toHaveLength(2);

    const after = clientStatePayloadTooLarge("tenant", "kanbanAppStateV3", slim);
    expect(after.tooLarge).toBe(false);
  });

  it("level 2 drops files and snapshots to fit limit", () => {
    const base = structuredClone(defaultAppState()) as KanbanAppState;
    const ortho = base.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!;
    // Много карточек с длинными описаниями — level 0 может ещё влезать, level 2 точно чистит.
    ortho.columns[0]!.cards = Array.from({ length: 40 }, (_, i) => ({
      id: `c${i}`,
      title: `t${i}`,
      description: "x".repeat(400),
      cardTypeId: "",
      assignees: [],
      participants: [],
      dueDate: "",
      urgent: false,
      checklist: [],
      files: Array.from({ length: 12 }, (_, j) => ({
        id: `f${i}-${j}`,
        name: `f${j}.png`,
        mime: "image/png",
        size: 10,
        dataUrl: `/api/orders/o/attachments/a${j}`,
        addedAt: "2026-01-01T00:00:00.000Z",
        addedByUserId: "u1",
      })),
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
      productionChecklistSnapshots: [
        {
          childCardId: "ch",
          childTitle: "child",
          columnTitle: "col",
          updatedAt: "2026-01-01T00:00:00.000Z",
          checklist: Array.from({ length: 20 }, (_, k) => ({
            id: `pc${k}`,
            text: "stl".repeat(30),
            completed: false,
            sourceFileId: "sf",
            sourceFileName: "a.stl",
            fromArchive: false,
            reworkEvents: ["a", "b", "c"],
          })),
        },
      ],
    }));

    const slim0 = slimKanbanStateForClientState(base, 0);
    const card0 = slim0.boards
      .find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!
      .columns[0]!.cards[0]!;
    expect(card0.files.length).toBeLessThanOrEqual(6);
    expect(card0.comments).toHaveLength(0);

    const slim2 = slimKanbanStateForClientState(base, 2);
    const card2 = slim2.boards
      .find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!
      .columns[0]!.cards[0]!;
    expect(card2.files).toEqual([]);
    expect(card2.productionChecklistSnapshots).toEqual([]);
  });

  it("strips chat/files from archived and stopped cards", () => {
    const base = structuredClone(defaultAppState()) as KanbanAppState;
    const ortho = base.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!;
    const heavy = {
      id: "archived1",
      title: "old",
      description: "d".repeat(500),
      cardTypeId: "",
      assignees: [] as string[],
      participants: [] as string[],
      dueDate: "",
      urgent: false,
      checklist: [],
      files: [
        {
          id: "f1",
          name: "x.png",
          mime: "image/png",
          size: 1,
          dataUrl: "/api/orders/o/attachments/a",
          addedAt: "2026-01-01T00:00:00.000Z",
          addedByUserId: "u1",
        },
      ],
      comments: [
        {
          id: "cm1",
          userId: "u1",
          text: "hello",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      activity: [
        {
          id: "a1",
          type: "move",
          text: "moved",
          userId: "u1",
          at: "2026-01-01T00:00:00.000Z",
        },
      ],
      blocked: false,
      blockReason: "",
      blockedByUserId: "",
      blockedAt: "",
      createdByUserId: "u1",
      lastMovedAt: null,
      trackLane: "",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    ortho.archivedCards = [
      { card: structuredClone(heavy), archivedAt: "2026-01-02T00:00:00.000Z" },
    ];
    ortho.stoppedCards = [
      {
        card: structuredClone({ ...heavy, id: "stopped1", blocked: true }),
        stoppedAt: "2026-01-02T00:00:00.000Z",
        fromColumnId: ortho.columns[0]!.id,
      },
    ];

    const slim = slimKanbanStateForClientState(base);
    const arch = slim.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!
      .archivedCards[0]!.card;
    const stop = slim.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!
      .stoppedCards[0]!.card;

    expect(arch.comments).toEqual([]);
    expect(arch.activity).toEqual([]);
    expect(arch.files).toEqual([]);
    expect(arch.description.length).toBeLessThanOrEqual(41);
    expect(stop.comments).toEqual([]);
    expect(stop.files).toEqual([]);
  });

  it("keeps all order-attachment files on linked cards (no flicker)", () => {
    const base = structuredClone(defaultAppState()) as KanbanAppState;
    const ortho = base.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!;
    ortho.columns[0]!.cards = [
      {
        id: "linked-files",
        title: "2608-214 Лихачева",
        description: "",
        cardTypeId: "",
        assignees: [],
        participants: [],
        dueDate: "",
        urgent: false,
        checklist: [],
        files: Array.from({ length: 8 }, (_, j) => ({
          id: `oa-att${j}`,
          name: "image.png",
          mime: "image/png",
          size: 1000 + j,
          dataUrl: `/api/orders/ord1/attachments/att${j}`,
          addedAt: "2026-08-17T09:50:00.000Z",
          addedByUserId: "u1",
          orderAttachmentId: `att${j}`,
        })),
        comments: [],
        activity: [],
        blocked: false,
        blockReason: "",
        blockedByUserId: "",
        blockedAt: "",
        createdByUserId: "u1",
        lastMovedAt: null,
        trackLane: "",
        linkedOrderId: "ord1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const slim = slimKanbanStateForClientState(base);
    const card = slim.boards
      .find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!
      .columns[0]!.cards[0]!;
    expect(card.files).toHaveLength(8);
    expect(card.files.every((f) => f.name === "image.png")).toBe(true);
  });

  it("clears description for linked-order cards (rehydrated from Order)", () => {
    const base = structuredClone(defaultAppState()) as KanbanAppState;
    const ortho = base.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!;
    ortho.columns[0]!.cards = [
      {
        id: "linked1",
        title: "2607-327",
        description:
          "Заказ от клиента:\nПисьмо: Велижанина\nОт: Никита Соколов\nДата: 23.07.26\n\nПолный текст с https://disk.yandex.ru/d/x",
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
        linkedOrderId: "order-velizhanina",
        kaitenCardId: 123,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const slim = slimKanbanStateForClientState(base);
    const card = slim.boards
      .find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!
      .columns[0]!.cards[0]!;
    expect(card.description).toBe("");
    expect(card.linkedOrderId).toBe("order-velizhanina");
  });
});
