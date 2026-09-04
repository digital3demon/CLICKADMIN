import { describe, expect, it } from "vitest";
import {
  buildKanbanDisplayView,
  buildKaitenMirrorColumnsForBoard,
  createCard,
  KANBAN_BOARD_DISTRIBUTE_ID,
  KANBAN_BOARD_MY_CARDS_ID,
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
  KANBAN_BOARD_PRODUCTION_ID,
  listKanbanAggregateSourceBoards,
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
    expect(queueCol.cards.map((c) => c.id)).toEqual([
      "empty-team",
      "as-assignee",
      "as-participant",
    ]);
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

  it("поиск на «МОИ» показывает наряд без людей, если текст совпал", () => {
    const board = orthopedicsMirrorBoard();
    const prod = board.columns.find((c) => c.title === "Производство")!;
    prod.cards.push(
      createCard({
        id: "stepanov-empty",
        title: "2607-299 Степанов А.В. Жевлаков А. ХШ + Нагрузка",
        linkedOrderId: "ord-степанов",
        assignees: [],
        participants: [],
      }),
    );

    const state: KanbanAppState = {
      version: 1,
      boards: [board],
      activeBoardId: KANBAN_BOARD_MY_CARDS_ID,
      search: "степанов",
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
    expect(allIds).toContain("stepanov-empty");
  });

  it("без поиска не оставляет чужой наряд по sticky oid", () => {
    const board = orthopedicsMirrorBoard();
    const prod = board.columns.find((c) => c.title === "Производство")!;
    prod.cards.push(
      createCard({
        id: "stepanov-sticky",
        title: "2607-299 Степанов А.В.",
        linkedOrderId: "ord-степанов",
        assignees: [],
        participants: [],
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
      stickyLinkedOrderIds: ["ord-степанов"],
    });
    const allIds = displayBoard.columns.flatMap((c) => c.cards.map((x) => x.id));
    expect(allIds).not.toContain("stepanov-sticky");
  });

  it("живые люди на карточке важнее устаревшего кэша шапки", () => {
    const board = orthopedicsMirrorBoard();
    const col = board.columns.find((c) => c.title === "Согласование") ??
      board.columns.find((c) => c.title === "К исполнению")!;
    col.cards.push(
      createCard({
        id: "чужая-арина",
        title: "2608-318 Иванова С.В.",
        linkedOrderId: "ord-иванова",
        assignees: ["u-арина"],
        participants: [],
      }),
    );
    const state: KanbanAppState = {
      version: 1,
      boards: [board],
      activeBoardId: KANBAN_BOARD_MY_CARDS_ID,
      search: "",
      viewMode: "list",
      calendarMonth: { y: 2026, m: 8 },
      filters: {
        cardTypeId: "",
        due: "",
        assigneeUserId: "",
        participantUserId: "",
      },
      filterTemplates: [],
    };
    const memberHeads = {
      "oid:ord-иванова": {
        assignees: [],
        participants: ["u-всеволод"],
        fingerprint: null,
        stageDue: "2026-08-29",
      },
    };
    const { displayBoard } = buildKanbanDisplayView(state, {
      sessionUserId: "u-всеволод",
      sessionUserRole: "ADMIN",
      stickyLinkedOrderIds: ["ord-иванова"],
      memberHeads,
    });
    const allIds = displayBoard.columns.flatMap((c) => c.cards.map((x) => x.id));
    expect(allIds).not.toContain("чужая-арина");
  });

  it("без поиска оставляет наряд по кэшу шапки, даже если массивы пустые", () => {
    const board = orthopedicsMirrorBoard();
    const prod = board.columns.find((c) => c.title === "Производство")!;
    prod.cards.push(
      createCard({
        id: "степанов-кэш",
        title: "2607-299 Степанов А.В. Жевлаков",
        linkedOrderId: "ord-степанов",
        assignees: [],
        participants: [],
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
    const memberHeads = {
      "oid:ord-степанов": {
        assignees: [],
        participants: ["u-всеволод"],
        fingerprint: null,
        stageDue: "",
      },
    };
    const { displayBoard } = buildKanbanDisplayView(state, {
      sessionUserId: "u-всеволод",
      sessionUserRole: "ADMIN",
      memberHeads,
    });
    const allIds = displayBoard.columns.flatMap((c) => c.cards.map((x) => x.id));
    expect(allIds).toContain("степанов-кэш");
  });

  it("«Ответственный» берёт assignees из кэша, но не participants", () => {
    const board = orthopedicsMirrorBoard();
    const queueCol = board.columns.find((c) => c.title === "К исполнению")!;
    queueCol.cards.push(
      createCard({
        id: "только-участник",
        title: "2608-371 Кучинский О.",
        linkedOrderId: "ord-кучинский",
        assignees: [],
        participants: [],
      }),
    );
    queueCol.cards.push(
      createCard({
        id: "я-ответственный",
        title: "2608-372 Шубина",
        linkedOrderId: "ord-шубина",
        assignees: [],
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
    const memberHeads = {
      "oid:ord-кучинский": {
        assignees: [],
        participants: ["me"],
        fingerprint: null,
        stageDue: "",
      },
      "oid:ord-шубина": {
        assignees: ["me"],
        participants: [],
        fingerprint: null,
        stageDue: "",
      },
    };
    const { displayBoard } = buildKanbanDisplayView(state, {
      sessionUserId: "me",
      sessionUserRole: "ADMIN",
      memberHeads,
    });
    const allIds = displayBoard.columns.flatMap((c) => c.cards.map((x) => x.id));
    expect(allIds).toContain("я-ответственный");
    expect(allIds).not.toContain("только-участник");
  });

  it("«МОИ» забирает карточку Юли с ортодонтии, даже если шаблон — ортопедия", () => {
    const ortho = orthopedicsMirrorBoard();
    const odon: KanbanBoard = {
      id: KANBAN_BOARD_ORTHODONTICS_ID,
      title: "Ортодонтия",
      columns: buildKaitenMirrorColumnsForBoard(KANBAN_BOARD_ORTHODONTICS_ID),
      users: [],
      cardTypes: [],
      isPrivate: true,
      accessUserIds: [],
    };
    const shipped = odon.columns.find((c) => c.title === "Сдана админам")!;
    shipped.title = "Сдано админам";
    shipped.cards.push(
      createCard({
        id: "юля-ортодонтия",
        title: "2605-088 Мостепанова М.В. Сплинт",
        linkedOrderId: "ord-мостепанова",
        assignees: [],
        participants: ["u-юля"],
      }),
    );
    const state: KanbanAppState = {
      version: 1,
      boards: [ortho, odon],
      activeBoardId: KANBAN_BOARD_MY_CARDS_ID,
      search: "",
      viewMode: "list",
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
      sessionUserId: "u-юля",
      sessionUserRole: "PRODUCTION",
    });
    const allIds = displayBoard.columns.flatMap((c) => c.cards.map((x) => x.id));
    expect(allIds).toContain("юля-ортодонтия");
  });

  it("источники «МОИ» — все доски кроме производства и виртуальных", () => {
    const extra: KanbanBoard = {
      id: "kanban-board-extra-clinic",
      title: "Клиника",
      columns: [{ id: "col-extra", title: "К исполнению", cards: [] }],
      users: [],
      cardTypes: [],
    };
    const production: KanbanBoard = {
      id: KANBAN_BOARD_PRODUCTION_ID,
      title: "Производство",
      columns: [{ id: "col-prod", title: "Печать · В работе", cards: [] }],
      users: [],
      cardTypes: [],
    };
    const virtual: KanbanBoard = {
      id: KANBAN_BOARD_MY_CARDS_ID,
      title: "Мои",
      columns: [],
      users: [],
      cardTypes: [],
    };
    const state: KanbanAppState = {
      version: 1,
      boards: [orthopedicsMirrorBoard(), extra, production, virtual],
      activeBoardId: KANBAN_BOARD_MY_CARDS_ID,
      search: "",
      viewMode: "list",
      calendarMonth: { y: 2026, m: 8 },
      filters: {
        cardTypeId: "",
        due: "",
        assigneeUserId: "",
        participantUserId: "",
      },
      filterTemplates: [],
    };
    const ids = listKanbanAggregateSourceBoards(state).map((b) => b.id);
    expect(ids).toContain(KANBAN_BOARD_ORTHOPEDICS_ID);
    expect(ids).toContain("kanban-board-extra-clinic");
    expect(ids).not.toContain(KANBAN_BOARD_PRODUCTION_ID);
    expect(ids).not.toContain(KANBAN_BOARD_MY_CARDS_ID);
  });

  it("«МОИ» не берёт карточки с производства, даже если пользователь в команде", () => {
    const ortho = orthopedicsMirrorBoard();
    ortho.columns.find((c) => c.title === "К исполнению")!.cards.push(
      createCard({
        id: "юля-ортопедия",
        title: "2608-010 Ортопедия",
        linkedOrderId: "ord-ортопедия",
        assignees: [],
        participants: ["u-юля"],
      }),
    );
    const production: KanbanBoard = {
      id: KANBAN_BOARD_PRODUCTION_ID,
      title: "Производство",
      columns: [
        {
          id: "col-prod",
          title: "Печать · В работе",
          cards: [
            createCard({
              id: "юля-производство",
              title: "2608-011 Печать",
              linkedOrderId: "ord-печать",
              assignees: ["u-юля"],
              participants: [],
            }),
          ],
        },
      ],
      users: [],
      cardTypes: [],
    };
    const extra: KanbanBoard = {
      id: "kanban-board-extra-clinic",
      title: "Клиника",
      columns: [
        {
          id: "col-extra",
          title: "К исполнению",
          cards: [
            createCard({
              id: "юля-клиника",
              title: "2608-012 Клиника",
              linkedOrderId: "ord-клиника",
              assignees: [],
              participants: ["u-юля"],
            }),
          ],
        },
      ],
      users: [],
      cardTypes: [],
    };
    const state: KanbanAppState = {
      version: 1,
      boards: [ortho, extra, production],
      activeBoardId: KANBAN_BOARD_MY_CARDS_ID,
      search: "",
      viewMode: "list",
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
      sessionUserId: "u-юля",
      sessionUserRole: "PRODUCTION",
    });
    const allIds = displayBoard.columns.flatMap((c) => c.cards.map((x) => x.id));
    expect(allIds).toContain("юля-ортопедия");
    expect(allIds).toContain("юля-клиника");
    expect(allIds).not.toContain("юля-производство");
  });
});
