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
  it("при поиске подмешивает попадания с других доступных досок", () => {
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
    expect(ids).toContain("foreign-hit");
    expect(cardHomeBoardId.get("local-hit")).toBe(KANBAN_BOARD_ORTHOPEDICS_ID);
    expect(cardHomeBoardId.get("foreign-hit")).toBe(KANBAN_BOARD_ORTHODONTICS_ID);
  });

  it("цифровой 214 не тянет карточку только с датой 14.08", () => {
    const ortho = mirrorBoard(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия");
    const odon = mirrorBoard(KANBAN_BOARD_ORTHODONTICS_ID, "Ортодонтия");
    const queueOdon = odon.columns.find((c) => c.title === "К исполнению")!;
    const shippedOdon = odon.columns.find((c) => c.title === "Сдана админам")!;
    queueOdon.cards.push(
      createCard({
        id: "hit-214",
        title: "2608-214 Лихачева М. Амирханова ап.Шварца 27.08 09:00",
        linkedOrderId: "o-hit",
      }),
    );
    shippedOdon.cards.push(
      createCard({
        id: "miss-14",
        title: "2607-392 Сторожук Д. Ерунова О.В. Сплинт МРТ 14.08",
        linkedOrderId: "order_cuid_214_hidden",
      }),
    );
    const state: KanbanAppState = {
      version: 1,
      boards: [ortho, odon],
      activeBoardId: KANBAN_BOARD_ORTHOPEDICS_ID,
      search: "214",
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
    expect(ids).toEqual(["hit-214"]);
    expect(cardHomeBoardId.get("hit-214")).toBe(KANBAN_BOARD_ORTHODONTICS_ID);
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

  it("при поиске показывает попадание из архива в колонке, откуда ушла карточка", () => {
    const ortho = mirrorBoard(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия");
    const shipped = ortho.columns.find((c) => c.title === "Сдана админам")!;
    const archivedCard = createCard({
      id: "arch-079",
      title: "2605-079 Тетеркина В. Династия 12.05 09:00",
      linkedOrderId: "o-arch",
    });
    ortho.archivedCards = [
      {
        id: "arch-row",
        card: archivedCard,
        archivedAt: "2026-08-01T00:00:00.000Z",
        deleteAfterAt: "2027-08-01T00:00:00.000Z",
        sourceColumnId: shipped.id,
        sourceColumnTitle: "Сдана админам",
        reason: "auto",
      },
    ];
    const state: KanbanAppState = {
      version: 1,
      boards: [ortho],
      activeBoardId: KANBAN_BOARD_ORTHOPEDICS_ID,
      search: "079",
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
    const shippedView = displayBoard.columns.find((c) => c.title === "Сдана админам");
    expect(shippedView?.cards.map((c) => c.id)).toEqual(["arch-079"]);
    expect(cardHomeBoardId.get("arch-079")).toBe(KANBAN_BOARD_ORTHOPEDICS_ID);
  });
});
