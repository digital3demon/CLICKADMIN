import { describe, expect, it } from "vitest";
import { createCard } from "@/lib/kanban/model";
import { crmColumnPersistFromLinkedMove } from "@/lib/kanban/crm-column-persist";
import {
  crmBoardFieldsFromKaitenRefreshPatch,
  listOrderIdsNeedingCrmPeoplePersist,
  listOrderIdsNeedingCrmStageDuePersist,
} from "@/lib/kanban/persist-crm-board-fields-client";
import type { KanbanAppState } from "@/lib/kanban/types";

function stateWithCard(
  linkedOrderId: string,
  stageDueDate: string,
): KanbanAppState {
  return {
    version: 1,
    boards: [
      {
        id: "b1",
        title: "Ортопедия",
        columns: [
          {
            id: "c1",
            title: "Согласование",
            cards: [
              createCard({
                id: "карта-степанов",
                title: "2607-299 Степанов А.В.",
                linkedOrderId,
                stageDueDate,
              }),
            ],
          },
        ],
        users: [],
        cardTypes: [],
      },
    ],
    activeBoardId: "b1",
    search: "",
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
}

describe("listOrderIdsNeedingCrmStageDuePersist", () => {
  it("пишет локальный этапный срок, если в плитке пусто (кириллица в oid)", () => {
    const rows = listOrderIdsNeedingCrmStageDuePersist(
      stateWithCard("ord-степанов", "2026-08-29"),
      [{ orderId: "ord-степанов", stageDueYmd: "" }],
    );
    expect(rows).toEqual([{ orderId: "ord-степанов", stageDueYmd: "2026-08-29" }]);
  });

  it("не дублирует срок, который уже в БД", () => {
    const rows = listOrderIdsNeedingCrmStageDuePersist(
      stateWithCard("ord-степанов", "2026-08-29"),
      [{ orderId: "ord-степанов", stageDueYmd: "2026-08-29" }],
    );
    expect(rows).toEqual([]);
  });

  it("не трогает наряд вне текущей пачки плиток", () => {
    const rows = listOrderIdsNeedingCrmStageDuePersist(
      stateWithCard("ord-степанов", "2026-08-29"),
      [],
    );
    expect(rows).toEqual([]);
  });
});

function stateWithPeople(
  linkedOrderId: string,
  assignees: string[],
  participants: string[],
): KanbanAppState {
  return {
    version: 1,
    boards: [
      {
        id: "b1",
        title: "Ортодонтия",
        columns: [
          {
            id: "c1",
            title: "Сборка",
            cards: [
              createCard({
                id: "карта-юля",
                title: "2608-12 Крупышева",
                linkedOrderId,
                assignees,
                participants,
              }),
            ],
          },
        ],
        users: [],
        cardTypes: [],
      },
    ],
    activeBoardId: "b1",
    search: "",
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
}

describe("listOrderIdsNeedingCrmPeoplePersist", () => {
  it("пишет локальных участников, если в плитке пусто (кириллица в oid)", () => {
    const rows = listOrderIdsNeedingCrmPeoplePersist(
      stateWithPeople("ord-юля", ["u-я"], ["u-юля"]),
      [{ orderId: "ord-юля", assignees: [], participants: [] }],
    );
    expect(rows).toEqual([
      { orderId: "ord-юля", assignees: ["u-я"], participants: ["u-юля"] },
    ]);
  });

  it("не дублирует людей, которые уже в БД", () => {
    const rows = listOrderIdsNeedingCrmPeoplePersist(
      stateWithPeople("ord-юля", ["u-я"], []),
      [{ orderId: "ord-юля", assignees: ["u-я"], participants: [] }],
    );
    expect(rows).toEqual([]);
  });
});

describe("crmBoardFieldsFromKaitenRefreshPatch", () => {
  it("берёт срок и людей, пустой патч не пишет", () => {
    expect(
      crmBoardFieldsFromKaitenRefreshPatch({
        cardId: "c-1",
        linkedOrderId: "ord-степанов",
        kaitenCardId: 11,
        assignees: ["u-я"],
        participants: [],
        fingerprint: "fp",
        unmappedLabels: [],
        kaitenHead: { due_date: "2026-08-29" },
      }),
    ).toEqual({
      orderId: "ord-степанов",
      assignees: ["u-я"],
      participants: [],
      stageDueYmd: "2026-08-29",
    });
    expect(
      crmBoardFieldsFromKaitenRefreshPatch({
        cardId: "c-empty",
        linkedOrderId: "ord-пусто",
        kaitenCardId: 12,
        assignees: [],
        participants: [],
        fingerprint: "fp",
        unmappedLabels: [],
        kaitenHead: { due_date: null },
      }),
    ).toBeNull();
    expect(
      crmBoardFieldsFromKaitenRefreshPatch({
        cardId: "c-col",
        linkedOrderId: "ord-жеребцов",
        kaitenCardId: 13,
        assignees: [],
        participants: [],
        fingerprint: "fp",
        unmappedLabels: [],
        kaitenHead: null,
        columnTitle: "Согласование Жеребцов",
      }),
    ).toEqual({
      orderId: "ord-жеребцов",
      columnTitle: "Согласование Жеребцов",
    });
    expect(
      crmBoardFieldsFromKaitenRefreshPatch({
        cardId: "c-block",
        linkedOrderId: "ord-тындик",
        kaitenCardId: 14,
        assignees: [],
        participants: [],
        fingerprint: "fp",
        unmappedLabels: [],
        kaitenHead: { blocked: true, block_reason: "ждём КТ Тындик" },
      }),
    ).toMatchObject({
      orderId: "ord-тындик",
      blocked: true,
      blockReason: "ждём КТ Тындик",
    });
  });
});

describe("crmColumnPersistFromLinkedMove", () => {
  it("пишет колонку наряда без Kaiten (кириллица вокруг номера)", () => {
    expect(
      crmColumnPersistFromLinkedMove({
        linkedOrderId: "наряд-остренкова",
        columnTitle: "Производство",
      }),
    ).toEqual({
      orderId: "наряд-остренкова",
      columnTitle: "Производство",
    });
  });

  it("не пишет пустую колонку или карточку без наряда", () => {
    expect(
      crmColumnPersistFromLinkedMove({
        linkedOrderId: "наряд-остренкова",
        columnTitle: "  ",
      }),
    ).toBeNull();
    expect(
      crmColumnPersistFromLinkedMove({
        linkedOrderId: "",
        columnTitle: "Производство",
      }),
    ).toBeNull();
  });
});
