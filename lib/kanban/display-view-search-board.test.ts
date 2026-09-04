import { describe, expect, it } from "vitest";
import {
  buildKanbanDisplayView,
  buildKaitenMirrorColumnsForBoard,
  createCard,
  KANBAN_BOARD_MY_CARDS_ID,
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

  it("299 подмешивает 2607-299 с Ортодонтии при активной Ортопедии", () => {
    const ortho = mirrorBoard(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия");
    const odon = mirrorBoard(KANBAN_BOARD_ORTHODONTICS_ID, "Ортодонтия");
    const approvalOdon = odon.columns.find((c) => c.title === "Согласование")!;
    approvalOdon.cards.push(
      createCard({
        id: "hit-299",
        title: "2607-299 Степанов А.В. Жевлаков А. ХШ + Нагрузка 24.08 09:00",
        linkedOrderId: "o-299",
        linkedOrderNumber: "2607-299",
      }),
    );
    const state: KanbanAppState = {
      version: 1,
      boards: [ortho, odon],
      activeBoardId: KANBAN_BOARD_ORTHOPEDICS_ID,
      search: "299",
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
    expect(ids).toContain("hit-299");
    expect(cardHomeBoardId.get("hit-299")).toBe(KANBAN_BOARD_ORTHODONTICS_ID);
  });

  it("при поиске оставляет скелет колонок, попадание остаётся в своей", () => {
    const ortho = mirrorBoard(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия");
    const shipped = ortho.columns.find((c) => c.title === "Сдана админам")!;
    shipped.cards.push(
      createCard({
        id: "orlov",
        title: "2608-119 Орлов Ю. Енькова А.А. Временные 13.08",
        linkedOrderId: "o-orlov",
      }),
    );
    const nativeTitles = ortho.columns.map((c) => c.title);
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
    expect(displayBoard.columns.map((c) => c.title)).toEqual(nativeTitles);
    expect(
      displayBoard.columns.find((c) => c.title === "Сдана админам")?.cards.map((c) => c.id),
    ).toEqual(["orlov"]);
    expect(
      displayBoard.columns
        .filter((c) => c.title !== "Сдана админам")
        .every((c) => c.cards.length === 0),
    ).toBe(true);
  });

  it("поиск «шубина»: кириллица вокруг совпадения, пустые колонки не выкидываются", () => {
    const odon = mirrorBoard(KANBAN_BOARD_ORTHODONTICS_ID, "Ортодонтия");
    const temp = odon.columns[0]!;
    temp.title = "Сдача админом · ВРЕМЕННЫЕ";
    temp.cards.push(
      createCard({
        id: "shubina",
        title: "2607-115 Шубина Т.В. Невский Д.Д. Временные",
        linkedOrderId: "o-шубина",
      }),
    );
    const nativeTitles = odon.columns.map((c) => c.title);
    const state: KanbanAppState = {
      version: 1,
      boards: [odon],
      activeBoardId: KANBAN_BOARD_ORTHODONTICS_ID,
      search: "шубина",
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
    expect(displayBoard.columns.map((c) => c.title)).toEqual(nativeTitles);
    expect(displayBoard.columns[0]!.cards.map((c) => c.id)).toEqual(["shubina"]);
  });

  it("при поиске не подмешивает архив в колонки доски", () => {
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
    const allIds = displayBoard.columns.flatMap((c) => c.cards.map((x) => x.id));
    expect(allIds).not.toContain("arch-079");
    expect(cardHomeBoardId.has("arch-079")).toBe(false);
  });

  it("при поиске не подмешивает СТОП в колонки доски", () => {
    const ortho = mirrorBoard(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия");
    const queue = ortho.columns.find((c) => c.title === "К исполнению")!;
    const stoppedCard = createCard({
      id: "stop-171",
      title: "2608-171 Груздева К.Н. Сканы",
      linkedOrderId: "o-stop",
    });
    ortho.stoppedCards = [
      {
        id: "stop-row",
        card: stoppedCard,
        stoppedAt: "2026-09-02T00:00:00.000Z",
        sourceColumnId: queue.id,
        sourceColumnTitle: "К исполнению",
      },
    ];
    const state: KanbanAppState = {
      version: 1,
      boards: [ortho],
      activeBoardId: KANBAN_BOARD_ORTHOPEDICS_ID,
      search: "171",
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
    const allIds = displayBoard.columns.flatMap((c) => c.cards.map((x) => x.id));
    expect(allIds).not.toContain("stop-171");
    expect(displayBoard.columns.find((c) => c.title === "СТОП")).toBeUndefined();
    expect(cardHomeBoardId.has("stop-171")).toBe(false);
  });
});

describe("buildKanbanDisplayView · фильтры только активная доска", () => {
  function boardsWithSameAssignee() {
    const ortho = mirrorBoard(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия");
    const odon = mirrorBoard(KANBAN_BOARD_ORTHODONTICS_ID, "Ортодонтия");
    const approvalOrtho = ortho.columns.find((c) => c.title === "Согласование")!;
    const approvalOdon = odon.columns.find((c) => c.title === "Согласование")!;
    approvalOrtho.cards.push(
      createCard({
        id: "на-ортопедии",
        title: "2608-375 Перчак М.Я. Постоянные",
        linkedOrderId: "o-local",
        assignees: ["u-всеволод"],
      }),
      createCard({
        id: "на-ортопедии-другой",
        title: "2608-353 Шубина Т.В. Временные",
        linkedOrderId: "o-local-other",
        assignees: ["u-олег"],
      }),
    );
    approvalOdon.cards.push(
      createCard({
        id: "с-ортодонтии",
        title: "2608-352 Невский Д.Д. Временные",
        linkedOrderId: "o-foreign",
        assignees: ["u-всеволод"],
      }),
    );
    return { ortho, odon };
  }

  it("без поиска фильтр не подмешивает чужую доску в данные вида", () => {
    const { ortho, odon } = boardsWithSameAssignee();
    const state: KanbanAppState = {
      version: 1,
      boards: [ortho, odon],
      activeBoardId: KANBAN_BOARD_ORTHOPEDICS_ID,
      search: "",
      viewMode: "board",
      calendarMonth: { y: 2026, m: 8 },
      filters: {
        cardTypeId: "",
        due: "",
        assigneeUserId: "u-всеволод",
        participantUserId: "",
      },
      filterTemplates: [],
    };
    const { displayBoard, cardHomeBoardId } = buildKanbanDisplayView(state, {
      sessionUserId: "me",
      sessionUserRole: "ADMIN",
      memberHeads: null,
    });
    const ids = displayBoard.columns.flatMap((c) => c.cards.map((x) => x.id));
    expect(ids).toContain("на-ортопедии");
    expect(ids).toContain("на-ортопедии-другой");
    expect(ids).not.toContain("с-ортодонтии");
    expect(cardHomeBoardId.get("на-ортопедии")).toBe(KANBAN_BOARD_ORTHOPEDICS_ID);
  });

  it("поиск + фильтр: кириллица вокруг совпадения, чужая доска не подмешивается", () => {
    const { ortho, odon } = boardsWithSameAssignee();
    const approvalOdon = odon.columns.find((c) => c.title === "Согласование")!;
    approvalOdon.cards[0]!.title = "2608-352 Перчак с ортодонтии Временные";
    const state: KanbanAppState = {
      version: 1,
      boards: [ortho, odon],
      activeBoardId: KANBAN_BOARD_ORTHOPEDICS_ID,
      search: "перчак",
      viewMode: "board",
      calendarMonth: { y: 2026, m: 8 },
      filters: {
        cardTypeId: "",
        due: "",
        assigneeUserId: "u-всеволод",
        participantUserId: "",
      },
      filterTemplates: [],
    };
    const { displayBoard } = buildKanbanDisplayView(state, {
      sessionUserId: "me",
      sessionUserRole: "ADMIN",
      memberHeads: null,
    });
    const ids = displayBoard.columns.flatMap((c) => c.cards.map((x) => x.id));
    expect(ids).toEqual(["на-ортопедии"]);
  });

  it("«Мои» при том же фильтре по-прежнему собирает с обеих досок", () => {
    const { ortho, odon } = boardsWithSameAssignee();
    const state: KanbanAppState = {
      version: 1,
      boards: [ortho, odon],
      activeBoardId: KANBAN_BOARD_MY_CARDS_ID,
      search: "",
      viewMode: "board",
      calendarMonth: { y: 2026, m: 8 },
      filters: {
        cardTypeId: "",
        due: "",
        assigneeUserId: "u-всеволод",
        participantUserId: "",
      },
      filterTemplates: [],
    };
    const { displayBoard, cardHomeBoardId } = buildKanbanDisplayView(state, {
      sessionUserId: "u-всеволод",
      sessionUserRole: "ADMIN",
      memberHeads: null,
    });
    const ids = displayBoard.columns.flatMap((c) => c.cards.map((x) => x.id));
    expect(ids).toContain("на-ортопедии");
    expect(ids).toContain("с-ортодонтии");
    expect(cardHomeBoardId.get("на-ортопедии")).toBe(KANBAN_BOARD_ORTHOPEDICS_ID);
    expect(cardHomeBoardId.get("с-ортодонтии")).toBe(KANBAN_BOARD_ORTHODONTICS_ID);
  });
});
