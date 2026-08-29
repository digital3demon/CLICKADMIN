import { describe, expect, it } from "vitest";
import {
  collectKanbanStageDueCards,
  formatKanbanStageDueTelegramDetail,
  kanbanStageDlineWindowForCommand,
  kanbanStageDueYmdInInclusiveRange,
  kanbanStageDueYmdOnOrBeforeEnd,
  mergeKanbanStageDueCards,
} from "@/lib/telegram-bot-kanban-stage-dline-helpers";
import { createCard } from "@/lib/kanban/model";
import type { KanbanAppState } from "@/lib/kanban/types";

describe("kanbanStageDlineWindowForCommand", () => {
  it("мой срок — заголовок «по дату включительно»", () => {
    expect(kanbanStageDlineWindowForCommand("/dlinetd", "2026-08-28").header).toBe(
      "Мой срок, по 2026-08-28 включительно (2026-08-28…2026-08-28, МСК)",
    );
    expect(kanbanStageDlineWindowForCommand("/dlinew", "2026-08-24").header).toBe(
      "Мой срок, по 2026-08-28 включительно (2026-08-24…2026-08-28, МСК)",
    );
    expect(kanbanStageDlineWindowForCommand("/dlinetm", "2026-08-28").header).toBe(
      "Мой срок, по 2026-08-31 включительно (2026-08-28…2026-08-31, МСК)",
    );
  });
});

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

describe("kanbanStageDueYmdOnOrBeforeEnd", () => {
  it("берёт просроченные и границу, отсекает срок после окна", () => {
    expect(kanbanStageDueYmdOnOrBeforeEnd("2026-07-09", "2026-07-10")).toBe(true);
    expect(kanbanStageDueYmdOnOrBeforeEnd("2026-07-10", "2026-07-10")).toBe(true);
    expect(kanbanStageDueYmdOnOrBeforeEnd("2026-07-11", "2026-07-10")).toBe(false);
    expect(kanbanStageDueYmdOnOrBeforeEnd("", "2026-07-10")).toBe(false);
  });
});

describe("formatKanbanStageDueTelegramDetail", () => {
  it("статус и срок с кириллицей вокруг даты", () => {
    expect(formatKanbanStageDueTelegramDetail("К исполнению", "2026-08-27")).toBe(
      "Статус: К исполнению\nСрок : 27.08.26",
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
                id: "mine-overdue",
                title: "2607-099 Просрочка Иванова",
                assignees: ["user-a"],
                stageDueDate: "2026-07-09",
              }),
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
              createCard({
                id: "mine-later",
                title: "2607-103 Позже окна",
                assignees: ["user-a"],
                stageDueDate: "2026-07-12",
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

  it("фильтрует по ответственному и включает просроченные до конца окна", () => {
    const cards = collectKanbanStageDueCards(
      state,
      { startYmd: "2026-07-10", endYmd: "2026-07-10", header: "x" },
      { crmUserId: "user-a" },
    );
    expect(cards.map((c) => c.id)).toEqual(["mine-overdue", "mine-today"]);
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
    expect(cards.map((c) => c.id)).toEqual(["mine-overdue", "mine-today", "other-today"]);
  });
});

describe("mergeKanbanStageDueCards", () => {
  it("наряд из CRM побеждает leftover JSON с тем же oid (кириллица в номере)", () => {
    const fromOrders = [
      createCard({
        id: "kaiten-order-ord-степанов",
        title: "2607-299 Степанов А.В. из CRM",
        linkedOrderId: "ord-степанов",
        assignees: ["user-a"],
        stageDueDate: "2026-08-29",
      }),
    ];
    const fromJson = [
      createCard({
        id: "old-json",
        title: "2607-299 Степанов устарел",
        linkedOrderId: "ord-степанов",
        assignees: ["user-a"],
        stageDueDate: "2026-08-01",
      }),
      createCard({
        id: "локальная",
        title: "Локальная карточка",
        assignees: ["user-a"],
        stageDueDate: "2026-08-30",
      }),
    ];
    const merged = mergeKanbanStageDueCards(fromOrders, fromJson);
    expect(merged.map((c) => c.id)).toEqual([
      "kaiten-order-ord-степанов",
      "локальная",
    ]);
    expect(merged[0]!.title).toContain("из CRM");
  });
});
