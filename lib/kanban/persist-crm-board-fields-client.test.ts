import { describe, expect, it } from "vitest";
import { createCard } from "@/lib/kanban/model";
import { listOrderIdsNeedingCrmStageDuePersist } from "@/lib/kanban/persist-crm-board-fields-client";
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
