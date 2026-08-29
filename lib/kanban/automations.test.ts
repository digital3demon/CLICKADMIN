import { describe, expect, it } from "vitest";
import {
  applyKanbanAutomationDelayedArchives,
  normalizeArchiveAfterHours,
  runKanbanAutomations,
} from "@/lib/kanban/automations";
import { createCard } from "@/lib/kanban/model";
import type { KanbanBoard } from "@/lib/kanban/types";

function boardWithQueueAndAdmins(): KanbanBoard {
  return {
    id: "kanban-board-клиника-юли",
    title: "Клиника Юли",
    columns: [
      { id: "col-к-исполнению", title: "К исполнению", cards: [] },
      { id: "col-сдана-админам", title: "Сдана админам", cards: [] },
    ],
    users: [],
    cardTypes: [],
    automations: [],
    archivedCards: [],
  };
}

describe("archive automation", () => {
  it("0 часов — сразу в архив после переноса в «Сдана админам»", () => {
    const board = boardWithQueueAndAdmins();
    const card = createCard({
      id: "card-юля",
      title: "Юля сдала работу",
      lastMovedAt: new Date().toISOString(),
    });
    board.columns[1]!.cards.push(card);
    board.automations = [
      {
        id: "auto-архив",
        enabled: true,
        name: "Архив после сдачи",
        boardId: board.id,
        trigger: "card_moved_to_column",
        columnId: "col-сдана-админам",
        fromColumnId: "",
        cardTypeId: "",
        actions: [{ type: "archive", afterHours: 0 }],
      },
    ];
    runKanbanAutomations(board, {
      type: "card_moved_to_column",
      cardId: "card-юля",
      fromColumnId: "col-к-исполнению",
      toColumnId: "col-сдана-админам",
    });
    expect(board.columns[1]!.cards).toHaveLength(0);
    expect(board.archivedCards?.some((r) => r.card.id === "card-юля")).toBe(true);
  });

  it("48 часов — не архивирует сразу, архивирует когда простой вышел", () => {
    const board = boardWithQueueAndAdmins();
    const movedAt = new Date("2026-08-27T12:00:00.000Z").toISOString();
    board.columns[1]!.cards.push(
      createCard({
        id: "card-юля-48",
        title: "Сдана админам Юли",
        lastMovedAt: movedAt,
      }),
    );
    board.automations = [
      {
        id: "auto-архив-48",
        enabled: true,
        name: "Архив через 48 ч",
        boardId: board.id,
        trigger: "card_moved_to_column",
        columnId: "col-сдана-админам",
        fromColumnId: "",
        cardTypeId: "",
        actions: [{ type: "archive", afterHours: 48 }],
      },
    ];
    runKanbanAutomations(board, {
      type: "card_moved_to_column",
      cardId: "card-юля-48",
      fromColumnId: "col-к-исполнению",
      toColumnId: "col-сдана-админам",
    });
    expect(board.columns[1]!.cards.map((c) => c.id)).toContain("card-юля-48");
    expect(board.archivedCards || []).toHaveLength(0);

    const tooSoon = applyKanbanAutomationDelayedArchives(
      board,
      new Date("2026-08-28T11:00:00.000Z"),
    );
    expect(tooSoon).toBe(0);
    expect(board.columns[1]!.cards.map((c) => c.id)).toContain("card-юля-48");

    const due = applyKanbanAutomationDelayedArchives(
      board,
      new Date("2026-08-29T13:00:00.000Z"),
    );
    expect(due).toBe(1);
    expect(board.columns[1]!.cards).toHaveLength(0);
    expect(board.archivedCards?.[0]?.card.title).toBe("Сдана админам Юли");
  });

  it("уехавшая с колонки карточка не попадает в отложенный архив", () => {
    const board = boardWithQueueAndAdmins();
    board.columns[0]!.cards.push(
      createCard({
        id: "card-вернулась",
        title: "Вернули Юле",
        lastMovedAt: "2026-08-20T00:00:00.000Z",
      }),
    );
    board.automations = [
      {
        id: "auto-архив-48",
        enabled: true,
        name: "Архив через 48 ч",
        boardId: board.id,
        trigger: "card_moved_to_column",
        columnId: "col-сдана-админам",
        fromColumnId: "",
        cardTypeId: "",
        actions: [{ type: "archive", afterHours: 48 }],
      },
    ];
    expect(
      applyKanbanAutomationDelayedArchives(board, new Date("2026-08-29T00:00:00.000Z")),
    ).toBe(0);
    expect(board.columns[0]!.cards[0]?.id).toBe("card-вернулась");
  });
});

describe("normalizeArchiveAfterHours", () => {
  it("режет отрицательные и слишком большие значения", () => {
    expect(normalizeArchiveAfterHours(-3)).toBe(0);
    expect(normalizeArchiveAfterHours(48)).toBe(48);
    expect(normalizeArchiveAfterHours(24 * 200)).toBe(24 * 180);
  });
});
