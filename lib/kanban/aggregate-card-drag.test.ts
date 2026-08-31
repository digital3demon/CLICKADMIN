import { describe, expect, it } from "vitest";
import { applyAggregateCardDrag } from "@/lib/kanban/aggregate-card-drag";
import {
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

describe("applyAggregateCardDrag", () => {
  it("не меняет доску, если бросили на карточку с другой дорожки", () => {
    const ortho = mirrorBoard(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия");
    const odon = mirrorBoard(KANBAN_BOARD_ORTHODONTICS_ID, "Ортодонтия");
    const odonQueue = odon.columns.find((c) => c.title === "К исполнению")!;
    const orthoProd = ortho.columns.find((c) => c.title === "Производство")!;
    odonQueue.cards.push(
      createCard({
        id: "odon-card",
        title: "2608-076 ортодонтия",
        linkedOrderId: "ord-odon",
        kaitenCardId: 101,
        trackLane: "ORTHODONTICS",
      }),
    );
    orthoProd.cards.push(
      createCard({
        id: "ortho-card",
        title: "2608-001 ортопедия",
        linkedOrderId: "ord-ortho",
        kaitenCardId: 202,
        trackLane: "ORTHOPEDICS",
      }),
    );

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
        assigneeUserId: "",
        participantUserId: "",
      },
      filterTemplates: [],
    };

    const displayBoard: KanbanBoard = {
      id: KANBAN_BOARD_MY_CARDS_ID,
      title: "Мои",
      columns: [
        {
          id: "disp-queue",
          title: "К исполнению",
          cards: [...odonQueue.cards],
        },
        {
          id: "disp-prod",
          title: "Производство",
          cards: [...orthoProd.cards],
        },
      ],
      users: [],
      cardTypes: [],
    };
    const cardHomeBoardId = new Map<string, string>([
      ["odon-card", KANBAN_BOARD_ORTHODONTICS_ID],
      ["ortho-card", KANBAN_BOARD_ORTHOPEDICS_ID],
    ]);

    const res = applyAggregateCardDrag(
      state,
      displayBoard,
      cardHomeBoardId,
      {
        cardId: "odon-card",
        fromDisplayColId: "disp-queue",
        toDisplayColId: "disp-prod",
        newIndex: 0,
        overIsColumn: false,
        overCardId: "ortho-card",
      },
      { activityUserId: "me" },
    );

    expect(res.ok).toBe(true);
    expect(res.kaiten?.kaitenTrackLane).toBeUndefined();
    const stillOnOdon = odon.columns
      .find((c) => c.title === "Производство")!
      .cards.some((c) => c.id === "odon-card");
    const leakedToOrtho = ortho.columns.some((c) =>
      c.cards.some((x) => x.id === "odon-card"),
    );
    expect(stillOnOdon).toBe(true);
    expect(leakedToOrtho).toBe(false);
    expect(
      odon.columns.find((c) => c.title === "К исполнению")!.cards.some(
        (c) => c.id === "odon-card",
      ),
    ).toBe(false);
  });

  it("после переноса без Kaiten отдаёт колонку для записи в наряд (кириллица)", () => {
    const ortho = mirrorBoard(KANBAN_BOARD_ORTHOPEDICS_ID, "Ортопедия");
    const approval = ortho.columns.find((c) => c.title === "Согласование")!;
    const prod = ortho.columns.find((c) => c.title === "Производство")!;
    approval.cards.push(
      createCard({
        id: "остренкова-карта",
        title: "2608-078 Остренкова Л.Ф. Енькова А.А.",
        linkedOrderId: "наряд-остренкова",
      }),
    );

    const state: KanbanAppState = {
      version: 1,
      boards: [ortho],
      activeBoardId: KANBAN_BOARD_MY_CARDS_ID,
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

    const displayBoard: KanbanBoard = {
      id: KANBAN_BOARD_MY_CARDS_ID,
      title: "Мои все",
      columns: [
        { id: "disp-approval", title: "Согласование", cards: [...approval.cards] },
        { id: "disp-prod", title: "Производство", cards: [] },
      ],
      users: [],
      cardTypes: [],
    };

    const res = applyAggregateCardDrag(
      state,
      displayBoard,
      new Map([["остренкова-карта", KANBAN_BOARD_ORTHOPEDICS_ID]]),
      {
        cardId: "остренкова-карта",
        fromDisplayColId: "disp-approval",
        toDisplayColId: "disp-prod",
        newIndex: 0,
        overIsColumn: true,
        overCardId: null,
      },
      { activityUserId: "me" },
    );

    expect(res.ok).toBe(true);
    expect(res.kaiten).toBeUndefined();
    expect(res.crmPersist).toEqual({
      orderId: "наряд-остренкова",
      columnTitle: "Производство",
      sortOrder: 1,
    });
    expect(approval.cards.some((c) => c.id === "остренкова-карта")).toBe(false);
    expect(prod.cards.some((c) => c.id === "остренкова-карта")).toBe(true);
  });
});
