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
    cardTypeName: null,
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
    createdAt: "2026-07-29T10:00:00.000Z",
    timerStartedAt: null,
    timerDurationMs: null,
    timerFrozenAt: null,
    timerStartedByUserId: null,
    timerParkedAt: null,
    timerParkedRemainingMs: null,
    checklist: null,
    sourceEmailCount: 0,
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
    expect(card.createdAt).toBe("2026-07-29T10:00:00.000Z");
    expect(card.activity.some((a) => a.text === "Карточка создана")).toBe(true);
  });

  it("кладёт число писем на карточку для иконки почты", () => {
    const next = applyCrmBoardTilesToAppState(defaultAppState(), [
      tile({ orderId: "ord-почта-юля", sourceEmailCount: 2 }),
    ]);
    const loc = findCardByLinkedOrderId(next, "ord-почта-юля");
    const card =
      next.boards[loc!.boardIndex]!.columns[loc!.columnIndex]!.cards[loc!.cardIndex]!;
    expect(card.sourceEmailCount).toBe(2);
  });

  it("тип с наряда по имени «Сплинт», не сырой cuid", () => {
    const next = applyCrmBoardTilesToAppState(defaultAppState(), [
      tile({
        orderId: "ord-сплинт",
        cardTypeId: "cuid-из-наряда",
        cardTypeName: "Сплинт",
      }),
    ]);
    const loc = findCardByLinkedOrderId(next, "ord-сплинт");
    const card =
      next.boards[loc!.boardIndex]!.columns[loc!.columnIndex]!.cards[loc!.cardIndex]!;
    const board = next.boards[loc!.boardIndex]!;
    const splint = board.cardTypes.find((t) => t.name === "Сплинт");
    expect(splint?.id).toBeTruthy();
    expect(card.cardTypeId).toBe(splint!.id);
    expect(card.cardTypeId).not.toBe("cuid-из-наряда");
  });

  it("плитка «Моделировка» добавляет свой тип, не «Модели» и не «Временные»", () => {
    let state = defaultAppState();
    const odon = state.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    const vremId = odon.cardTypes.find((t) => t.name === "Временные")!.id;
    const modId = odon.cardTypes.find((t) => t.name === "Модели")!.id;
    odon.columns[0]!.cards.push(
      createCard({
        id: "was-vrem",
        title: "2607-438 Пехконен",
        linkedOrderId: "ord-мод",
        cardTypeId: vremId,
      }),
    );
    state = applyCrmBoardTilesToAppState(state, [
      tile({
        orderId: "ord-мод",
        cardTypeId: "cuid-из-наряда",
        cardTypeName: "Моделировка",
      }),
    ]);
    const loc = findCardByLinkedOrderId(state, "ord-мод");
    const board = state.boards[loc!.boardIndex]!;
    const card = board.columns[loc!.columnIndex]!.cards[loc!.cardIndex]!;
    const added = board.cardTypes.find((t) => t.name === "Моделировка");
    expect(added?.id).toBe("cuid-из-наряда");
    expect(card.cardTypeId).toBe("cuid-из-наряда");
    expect(card.cardTypeId).not.toBe(modId);
    expect(card.cardTypeId).not.toBe(vremId);
  });

  it("чужой id типа не затирает живой тип на карточке", () => {
    let state = defaultAppState();
    const odon = state.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    const splintId = odon.cardTypes.find((t) => t.name === "Сплинт")!.id;
    odon.columns[0]!.cards.push(
      createCard({
        id: "keep-type",
        title: "2608-191 Степанов",
        linkedOrderId: "ord-тип",
        cardTypeId: splintId,
      }),
    );
    state = applyCrmBoardTilesToAppState(state, [
      tile({
        orderId: "ord-тип",
        cardTypeId: "cuid-чужой",
        cardTypeName: "",
      }),
    ]);
    const loc = findCardByLinkedOrderId(state, "ord-тип");
    const card =
      state.boards[loc!.boardIndex]!.columns[loc!.columnIndex]!.cards[loc!.cardIndex]!;
    expect(card.cardTypeId).toBe(splintId);
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

  it("плитка СТОП не снимает карточку с парковки (кириллица в id)", () => {
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
          linkedOrderId: "наряд-стоп",
          assignees: ["u-я"],
        }),
      },
    ];
    state = applyCrmBoardTilesToAppState(
      state,
      [tile({ orderId: "наряд-стоп", columnTitle: "СТОП" })],
      { replaceBoardId: KANBAN_BOARD_ORTHODONTICS_ID },
    );
    expect(findCardByLinkedOrderId(state, "наряд-стоп")).toBeNull();
    expect(
      state.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!.stoppedCards?.[0]
        ?.card.linkedOrderId,
    ).toBe("наряд-стоп");
  });

  it("плитка с колонкой снимает карточку из СТОП на выбранную доску", () => {
    let state = defaultAppState();
    const odon = state.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    const target = odon.columns.find((c) => c.title === "К исполнению") ?? odon.columns[0]!;
    odon.stoppedCards = [
      {
        id: "stop-2",
        stoppedAt: "2026-08-28T10:00:00.000Z",
        sourceColumnId: odon.columns[0]!.id,
        sourceColumnTitle: odon.columns[0]!.title,
        card: createCard({
          id: "stopped-back",
          title: "вернуть из стопа",
          linkedOrderId: "наряд-возврат",
          assignees: ["u-я"],
        }),
      },
    ];
    state = applyCrmBoardTilesToAppState(
      state,
      [tile({ orderId: "наряд-возврат", columnTitle: target.title })],
      { replaceBoardId: KANBAN_BOARD_ORTHODONTICS_ID },
    );
    const loc = findCardByLinkedOrderId(state, "наряд-возврат");
    expect(loc).not.toBeNull();
    expect(state.boards[loc!.boardIndex]!.columns[loc!.columnIndex]!.title).toBe(
      target.title,
    );
    expect(
      state.boards
        .find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!
        .stoppedCards?.some((r) => r.card.linkedOrderId === "наряд-возврат"),
    ).toBe(false);
  });

  it("колонка СТОП в плитке восстанавливает парковку после F5 (кириллица)", () => {
    let state = defaultAppState();
    state = applyCrmBoardTilesToAppState(
      state,
      [tile({ orderId: "наряд-стоп", columnTitle: "СТОП", title: "2608-010 Петров" })],
      { replaceBoardId: KANBAN_BOARD_ORTHODONTICS_ID },
    );
    expect(findCardByLinkedOrderId(state, "наряд-стоп")).toBeNull();
    expect(
      state.boards
        .find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!
        .stoppedCards?.some((r) => r.card.linkedOrderId === "наряд-стоп"),
    ).toBe(true);
  });

  it("pending-перенос не откатывает карточку, пока плитка ещё в старой колонке", () => {
    let state = defaultAppState();
    const odon = state.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    const fromCol = odon.columns[0]!;
    const toCol = odon.columns[1]!;
    fromCol.cards.push(
      createCard({
        id: "keep-move",
        title: "2608-191 Жеребцов",
        linkedOrderId: "ord-прыжок",
      }),
    );
    state = applyCrmBoardTilesToAppState(
      state,
      [
        tile({
          orderId: "ord-прыжок",
          columnTitle: fromCol.title,
        }),
      ],
      {
        pendingMoves: [
          {
            cardId: "keep-move",
            orderId: "ord-прыжок",
            toColumnId: toCol.id,
            toColumnTitle: toCol.title,
            at: Date.now(),
          },
        ],
      },
    );
    const loc = findCardByLinkedOrderId(state, "ord-прыжок");
    expect(loc).not.toBeNull();
    expect(state.boards[loc!.boardIndex]!.columns[loc!.columnIndex]!.id).toBe(toCol.id);
  });

  it("таймер с плитки остаётся, локальный не затирается пустой плиткой", () => {
    let state = defaultAppState();
    const odon = state.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    odon.columns[0]!.cards.push(
      createCard({
        id: "keep-timer",
        title: "таймер Тындик",
        linkedOrderId: "ord-таймер",
        timerStartedAt: "2026-08-30T10:00:00.000Z",
        timerDurationMs: 1_800_000,
      }),
    );
    state = applyCrmBoardTilesToAppState(state, [
      tile({ orderId: "ord-таймер", timerStartedAt: null, timerDurationMs: null }),
    ]);
    const loc = findCardByLinkedOrderId(state, "ord-таймер");
    const card =
      state.boards[loc!.boardIndex]!.columns[loc!.columnIndex]!.cards[loc!.cardIndex]!;
    expect(card.timerStartedAt).toBe("2026-08-30T10:00:00.000Z");
    expect(card.timerDurationMs).toBe(1_800_000);
  });

  it("чеклист с плитки общий, пустая плитка не затирает локальный", () => {
    let state = defaultAppState();
    const odon = state.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    odon.columns[0]!.cards.push(
      createCard({
        id: "keep-cl",
        title: "чеклист Тындик",
        linkedOrderId: "ord-чеклист",
        checklist: [{ id: "c1", text: "примерка Тындик", completed: false }],
      }),
    );
    state = applyCrmBoardTilesToAppState(state, [
      tile({ orderId: "ord-чеклист", checklist: null }),
    ]);
    let loc = findCardByLinkedOrderId(state, "ord-чеклист");
    let card =
      state.boards[loc!.boardIndex]!.columns[loc!.columnIndex]!.cards[loc!.cardIndex]!;
    expect(card.checklist?.[0]?.text).toBe("примерка Тындик");

    state = applyCrmBoardTilesToAppState(state, [
      tile({
        orderId: "ord-чеклист",
        checklist: [{ id: "c2", text: "сканы Жеребцов", completed: true }],
      }),
    ]);
    loc = findCardByLinkedOrderId(state, "ord-чеклист");
    card =
      state.boards[loc!.boardIndex]!.columns[loc!.columnIndex]!.cards[loc!.cardIndex]!;
    expect(card.checklist).toEqual([
      {
        id: "c2",
        text: "сканы Жеребцов",
        completed: true,
        completedAt: null,
        assigneeId: null,
      },
    ]);
  });

  it("после F5 плитка «Производство» оставляет карточку там, без pending", () => {
    let state = defaultAppState();
    const ortho = state.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!;
    const approval = ortho.columns.find((c) => c.title === "Согласование")!;
    approval.cards.push(
      createCard({
        id: "остренкова-карта",
        title: "2608-078 Остренкова Л.Ф.",
        linkedOrderId: "наряд-остренкова",
      }),
    );
    state = applyCrmBoardTilesToAppState(
      state,
      [
        tile({
          orderId: "наряд-остренкова",
          orderNumber: "2608-078",
          title: "2608-078 Остренкова Л.Ф. Енькова А.А.",
          columnTitle: "Производство",
          trackLane: "ORTHOPEDICS",
          boardId: KANBAN_BOARD_ORTHOPEDICS_ID,
        }),
      ],
      { pendingMoves: [] },
    );
    const loc = findCardByLinkedOrderId(state, "наряд-остренкова");
    expect(loc).not.toBeNull();
    expect(state.boards[loc!.boardIndex]!.id).toBe(KANBAN_BOARD_ORTHOPEDICS_ID);
    expect(state.boards[loc!.boardIndex]!.columns[loc!.columnIndex]!.title).toBe(
      "Производство",
    );
  });

  it("плитка несёт снимок снятого таймера (кириллица в oid)", () => {
    let state = defaultAppState();
    state = applyCrmBoardTilesToAppState(state, [
      tile({
        orderId: "наряд-остренкова",
        title: "2608-078 Остренкова",
        timerStartedAt: null,
        timerDurationMs: 30 * 60 * 1000,
        timerParkedAt: "2026-08-31T12:00:00.000Z",
        timerParkedRemainingMs: 10 * 60 * 1000,
        trackLane: "ORTHOPEDICS",
        boardId: KANBAN_BOARD_ORTHOPEDICS_ID,
      }),
    ]);
    const loc = findCardByLinkedOrderId(state, "наряд-остренкова");
    const card =
      state.boards[loc!.boardIndex]!.columns[loc!.columnIndex]!.cards[loc!.cardIndex]!;
    expect(card.timerStartedAt).toBeNull();
    expect(card.timerParkedAt).toBe("2026-08-31T12:00:00.000Z");
    expect(card.timerParkedRemainingMs).toBe(10 * 60 * 1000);
  });

  it("плитка несёт автора таймера (кириллица в id)", () => {
    let state = defaultAppState();
    state = applyCrmBoardTilesToAppState(state, [
      tile({
        orderId: "наряд-пехконен",
        title: "2607-438 Пехконен С.",
        timerStartedAt: "2026-08-31T10:00:00.000Z",
        timerDurationMs: 30 * 60 * 1000,
        timerStartedByUserId: "u-всеволод",
        trackLane: "ORTHOPEDICS",
        boardId: KANBAN_BOARD_ORTHOPEDICS_ID,
      }),
    ]);
    const loc = findCardByLinkedOrderId(state, "наряд-пехконен");
    const card =
      state.boards[loc!.boardIndex]!.columns[loc!.columnIndex]!.cards[loc!.cardIndex]!;
    expect(card.timerStartedByUserId).toBe("u-всеволод");
  });

  it("локальная блокировка не слетает с пустой плитки", () => {
    let state = defaultAppState();
    const odon = state.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    odon.columns[0]!.cards.push(
      createCard({
        id: "keep-block",
        title: "стоп Анискина",
        linkedOrderId: "ord-блок",
        blocked: true,
        blockReason: "Не те данные от Анискиной",
      }),
    );
    state = applyCrmBoardTilesToAppState(state, [
      tile({ orderId: "ord-блок", blocked: false, blockReason: "" }),
    ]);
    const loc = findCardByLinkedOrderId(state, "ord-блок");
    const card =
      state.boards[loc!.boardIndex]!.columns[loc!.columnIndex]!.cards[loc!.cardIndex]!;
    expect(card.blocked).toBe(true);
    expect(card.blockReason).toBe("Не те данные от Анискиной");
  });
});
