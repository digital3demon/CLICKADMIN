import { describe, expect, it } from "vitest";
import {
  collectKanbanStageDueCards,
  kanbanStageDueYmdInInclusiveRange,
} from "@/lib/telegram-bot-kanban-stage-dline-helpers";
import { createCard } from "@/lib/kanban/model";
import type { KanbanAppState } from "@/lib/kanban/types";

describe("kanbanStageDueYmdInInclusiveRange", () => {
  it("включает границы диапазона YMD", () => {
    expect(kanbanStageDueYmdInInclusiveRange("2026-07-10", "2026-07-10", "2026-07-12")).toBe(
      true,
    );
    expect(kanbanStageDueYmdInInclusiveRange("2026-07-12", "2026-07-10", "2026-07-12")).toBe(
      true,
    );
    expect(kanbanStageDueYmdInInclusiveRange("2026-07-09", "2026-07-10", "2026-07-12")).toBe(
      false,
    );
  });
});

describe("collectKanbanStageDueCards", () => {
  const state: KanbanAppState = {
    version: 1,
    boards: [
      {
        id: "b1",
        title: "Тест",
        columns: [
          {
            id: "c1",
            title: "Колонка",
            cards: [
              createCard({
                id: "mine-today",
                title: "2607-100 Моя",
                assignees: ["user-a"],
                stageDueDate: "2026-07-10",
              }),
              createCard({
                id: "other-today",
                title: "2607-101 Чужая",
                assignees: ["user-b"],
                stageDueDate: "2026-07-10",
              }),
              createCard({
                id: "mine-no-due",
                title: "2607-102 Без срока",
                assignees: ["user-a"],
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
    viewMode: "list",
    calendarMonth: { y: 2026, m: 7 },
    filters: {
      cardTypeId: "",
      due: "",
      assigneeUserId: "",
      participantUserId: "",
    },
    filterTemplates: [],
  };

  it("фильтрует по ответственному и этапному сроку", () => {
    const cards = collectKanbanStageDueCards(
      state,
      { startYmd: "2026-07-10", endYmd: "2026-07-10", header: "x" },
      { crmUserId: "user-a" },
    );
    expect(cards.map((c) => c.id)).toEqual(["mine-today"]);
  });

  it("включает карточки, где пользователь только участник", () => {
    const withParticipant: KanbanAppState = {
      ...state,
      boards: [
        {
          ...state.boards[0]!,
          columns: [
            {
              ...state.boards[0]!.columns[0]!,
              cards: [
                createCard({
                  id: "participant-today",
                  title: "2607-200 Участник",
                  participants: ["user-a"],
                  stageDueDate: "2026-07-10",
                }),
              ],
            },
          ],
        },
      ],
    };
    const cards = collectKanbanStageDueCards(
      withParticipant,
      { startYmd: "2026-07-10", endYmd: "2026-07-10", header: "x" },
      { crmUserId: "user-a" },
    );
    expect(cards.map((c) => c.id)).toEqual(["participant-today"]);
  });

  it("без crmUserId — все карточки с этапным сроком в окне", () => {
    const cards = collectKanbanStageDueCards(
      state,
      { startYmd: "2026-07-10", endYmd: "2026-07-10", header: "x" },
    );
    expect(cards.map((c) => c.id)).toEqual(["mine-today", "other-today"]);
  });
});
