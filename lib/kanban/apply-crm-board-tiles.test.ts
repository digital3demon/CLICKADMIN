import { describe, expect, it } from "vitest";
import { applyCrmBoardTilesToAppState } from "@/lib/kanban/apply-crm-board-tiles";
import type { CrmBoardTile } from "@/lib/kanban/crm-board-tile";
import {
  buildKanbanDisplayView,
  createCard,
  defaultAppState,
  KANBAN_BOARD_MY_CARDS_ID,
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
  kanbanStateForPersistence,
} from "@/lib/kanban/model";
import { findCardByLinkedOrderId } from "@/lib/kanban/chat-sync";
import { countLinkedCardsInKanbanState } from "@/lib/kanban/kanban-tenant-chrome";
import { setKanbanStageDue } from "@/lib/kanban/kanban-stage-due";

function linkedCountOnBoard(state: ReturnType<typeof defaultAppState>, boardId: string): number {
  const board = state.boards.find((b) => b.id === boardId);
  if (!board) return 0;
  return board.columns.reduce(
    (n, col) => n + col.cards.filter((c) => c.linkedOrderId).length,
    0,
  );
}

function tile(partial: Partial<CrmBoardTile> & Pick<CrmBoardTile, "orderId">): CrmBoardTile {
  return {
    orderNumber: "2608-100",
    title: "2608-100 Тест",
    cardTypeId: null,
    assignees: ["u-я"],
    participants: [],
    stageDueYmd: "2026-09-01",
    urgent: false,
    blocked: false,
    blockReason: "",
    columnTitle: "К исполнению",
    sortOrder: 1,
    trackLane: "ORTHODONTICS",
    boardId: KANBAN_BOARD_ORTHODONTICS_ID,
    appointmentDate: null,
    dueToAdminsAt: null,
    dueToAdminsHasTime: true,
    updatedAt: "2026-08-28T12:00:00.000Z",
    ...partial,
  };
}

describe("applyCrmBoardTilesToAppState", () => {
  it("кладёт плитку на ортодонтию без описания", () => {
    const next = applyCrmBoardTilesToAppState(defaultAppState(), [
      tile({ orderId: "ord-odon" }),
    ]);
    const loc = findCardByLinkedOrderId(next, "ord-odon");
    expect(loc).not.toBeNull();
    expect(next.boards[loc!.boardIndex]!.id).toBe(KANBAN_BOARD_ORTHODONTICS_ID);
    const card =
      next.boards[loc!.boardIndex]!.columns[loc!.columnIndex]!.cards[loc!.cardIndex]!;
    expect(card.description).toBe("");
    expect(card.assignees).toEqual(["u-я"]);
  });

  it("две доски: замена ортодонтии не требует и не сносит ортопедию", () => {
    let state = defaultAppState();
    const orthoTiles = Array.from({ length: 40 }, (_, i) =>
      tile({
        orderId: `орто-${i}`,
        orderNumber: `2608-${100 + i}`,
        title: `2608-${100 + i} Ортопедия Иванов`,
        boardId: KANBAN_BOARD_ORTHOPEDICS_ID,
        trackLane: "ORTHOPEDICS",
        assignees: ["u-юля"],
      }),
    );
    const odonTiles = Array.from({ length: 40 }, (_, i) =>
      tile({
        orderId: `одон-${i}`,
        orderNumber: `2608-${200 + i}`,
        title: `2608-${200 + i} Ортодонтия Степанов`,
        boardId: KANBAN_BOARD_ORTHODONTICS_ID,
        trackLane: "ORTHODONTICS",
        assignees: ["u-юля"],
      }),
    );
    state = applyCrmBoardTilesToAppState(state, [...orthoTiles, ...odonTiles]);
    expect(linkedCountOnBoard(state, KANBAN_BOARD_ORTHOPEDICS_ID)).toBe(40);
    expect(linkedCountOnBoard(state, KANBAN_BOARD_ORTHODONTICS_ID)).toBe(40);

    state = applyCrmBoardTilesToAppState(
      state,
      [
        tile({
          orderId: "одон-0",
          title: "обновлено Степанов",
          assignees: ["u-юля", "u-я"],
        }),
      ],
      { replaceBoardId: KANBAN_BOARD_ORTHODONTICS_ID },
    );
    expect(linkedCountOnBoard(state, KANBAN_BOARD_ORTHODONTICS_ID)).toBe(1);
    expect(linkedCountOnBoard(state, KANBAN_BOARD_ORTHOPEDICS_ID)).toBe(40);
    const loc = findCardByLinkedOrderId(state, "одон-0");
    expect(loc).not.toBeNull();
    expect(
      state.boards[loc!.boardIndex]!.columns[loc!.columnIndex]!.cards[loc!.cardIndex]!
        .assignees,
    ).toEqual(["u-юля", "u-я"]);
  });

  it("Мои: полный набор плиток снимает устаревшую свою карточку", () => {
    let state = defaultAppState();
    const odon = state.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    odon.columns[0]!.cards.push(
      createCard({
        id: "stale-mine",
        title: "старая моя",
        linkedOrderId: "ord-stale",
        assignees: ["u-я"],
      }),
    );
    state = applyCrmBoardTilesToAppState(
      state,
      [
        tile({
          orderId: "ord-live",
          assignees: ["u-я"],
        }),
      ],
      { pruneMemberUserId: "u-я" },
    );
    expect(findCardByLinkedOrderId(state, "ord-stale")).toBeNull();
    expect(findCardByLinkedOrderId(state, "ord-live")).not.toBeNull();
  });

  it("Мои видит карточки с обеих досок без скана чужого tenant JSON", () => {
    let state = defaultAppState();
    state.activeBoardId = KANBAN_BOARD_MY_CARDS_ID;
    state = applyCrmBoardTilesToAppState(state, [
      tile({
        orderId: "ord-odon",
        assignees: ["u-я"],
        boardId: KANBAN_BOARD_ORTHODONTICS_ID,
        trackLane: "ORTHODONTICS",
      }),
      tile({
        orderId: "ord-ortho",
        assignees: ["u-я"],
        boardId: KANBAN_BOARD_ORTHOPEDICS_ID,
        trackLane: "ORTHOPEDICS",
      }),
    ]);
    const { displayBoard } = buildKanbanDisplayView(state, {
      sessionUserId: "u-я",
      sessionUserRole: "ADMIN",
    });
    const oids = displayBoard.columns.flatMap((c) =>
      c.cards.map((x) => x.linkedOrderId),
    );
    expect(oids).toContain("ord-odon");
    expect(oids).toContain("ord-ortho");
    expect(countLinkedCardsInKanbanState(kanbanStateForPersistence(state))).toBe(0);
  });

  it("пустая плитка не затирает людей, срок, файлы и комментарии", () => {
    let state = defaultAppState();
    const odon = state.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    odon.columns[0]!.cards.push(
      createCard({
        id: "keep-head",
        title: "старый заголовок",
        linkedOrderId: "ord-keep",
        assignees: ["u-юля"],
        participants: ["u-я"],
        description: "описание наряда",
        files: [
          {
            id: "f1",
            name: "снимок.png",
            mime: "image/png",
            size: 12,
            dataUrl: "/api/orders/ord-keep/attachments/a1",
            addedAt: "2026-08-28T10:00:00.000Z",
            addedByUserId: "u-я",
          },
        ],
        comments: [
          {
            id: "c1",
            userId: "u-я",
            text: "комментарий кириллица",
            createdAt: "2026-08-28T10:00:00.000Z",
          },
        ],
      }),
    );
    setKanbanStageDue(odon.columns[0]!.cards[0]!, "2026-09-10");
    state = applyCrmBoardTilesToAppState(state, [
      tile({
        orderId: "ord-keep",
        title: "новый заголовок Степанов",
        assignees: [],
        participants: [],
        stageDueYmd: "",
      }),
    ]);
    const loc = findCardByLinkedOrderId(state, "ord-keep");
    expect(loc).not.toBeNull();
    const card =
      state.boards[loc!.boardIndex]!.columns[loc!.columnIndex]!.cards[loc!.cardIndex]!;
    expect(card.assignees).toEqual(["u-юля"]);
    expect(card.participants).toEqual(["u-я"]);
    expect(card.description).toBe("описание наряда");
    expect(card.files?.[0]?.name).toBe("снимок.png");
    expect(card.comments?.[0]?.text).toBe("комментарий кириллица");
    expect(card.title).toBe("новый заголовок Степанов");
    expect(card.stageDueDate || "").toContain("2026-09-10");
  });

  it("не возвращает на доску карточку из СТОП", () => {
    let state = defaultAppState();
    const odon = state.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    odon.stoppedCards = [
      {
        id: "stop-1",
        stoppedAt: "2026-08-28T10:00:00.000Z",
        sourceColumnId: odon.columns[0]!.id,
        sourceColumnTitle: odon.columns[0]!.title,
        card: createCard({
          id: "stopped",
          title: "на стопе",
          linkedOrderId: "ord-stop",
          assignees: ["u-я"],
        }),
      },
    ];
    state = applyCrmBoardTilesToAppState(
      state,
      [tile({ orderId: "ord-stop" })],
      { replaceBoardId: KANBAN_BOARD_ORTHODONTICS_ID },
    );
    expect(findCardByLinkedOrderId(state, "ord-stop")).toBeNull();
    expect(
      state.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!.stoppedCards?.[0]
        ?.card.linkedOrderId,
    ).toBe("ord-stop");
  });
});
