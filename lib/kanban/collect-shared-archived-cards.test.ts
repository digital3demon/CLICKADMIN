import { describe, expect, it } from "vitest";
import { collectSharedArchivedCards } from "@/lib/kanban/collect-shared-archived-cards";
import { createCard, defaultAppState } from "@/lib/kanban/model";

describe("collectSharedArchivedCards", () => {
  it("собирает архив со всех досок (кириллица в id)", () => {
    const state = defaultAppState();
    const boardA = state.boards[0]!;
    const boardB = state.boards[1] ?? structuredClone(boardA);
    if (boardB.id === boardA.id) boardB.id = "board-ортодонтия";

    boardA.archivedCards = [
      {
        id: "arch-я",
        archivedAt: "2026-08-28T10:00:00.000Z",
        deleteAfterAt: "2027-08-28T10:00:00.000Z",
        sourceColumnId: boardA.columns[0]!.id,
        sourceColumnTitle: boardA.columns[0]!.title,
        reason: "manual",
        card: createCard({
          id: "card-ортопедия",
          title: "наряд 178 от 10.02.2026 Смирнов",
          linkedOrderId: "наряд-178",
        }),
      },
    ];
    boardB.archivedCards = [
      {
        id: "arch-б",
        archivedAt: "2026-08-29T10:00:00.000Z",
        deleteAfterAt: "2027-08-29T10:00:00.000Z",
        sourceColumnId: boardB.columns[0]!.id,
        sourceColumnTitle: boardB.columns[0]!.title,
        reason: "auto",
        card: createCard({
          id: "card-ортодонтия",
          title: "наряд 179 от 11.02.2026 Петрова",
          linkedOrderId: "наряд-179",
        }),
      },
    ];

    const rows = collectSharedArchivedCards([boardA, boardB]);
    expect(rows.map((r) => r.card.linkedOrderId)).toEqual([
      "наряд-179",
      "наряд-178",
    ]);
  });

  it("поиск по кириллице не прячет соседние карточки вне запроса", () => {
    const state = defaultAppState();
    const board = state.boards[0]!;
    board.archivedCards = [
      {
        id: "a1",
        archivedAt: "2026-08-28T10:00:00.000Z",
        deleteAfterAt: "2027-08-28T10:00:00.000Z",
        sourceColumnId: board.columns[0]!.id,
        sourceColumnTitle: board.columns[0]!.title,
        reason: "manual",
        card: createCard({
          id: "c1",
          title: "заказ Смирнов до правки",
          linkedOrderId: "наряд-смирнов",
        }),
      },
      {
        id: "a2",
        archivedAt: "2026-08-29T10:00:00.000Z",
        deleteAfterAt: "2027-08-29T10:00:00.000Z",
        sourceColumnId: board.columns[0]!.id,
        sourceColumnTitle: board.columns[0]!.title,
        reason: "manual",
        card: createCard({
          id: "c2",
          title: "заказ Петрова после правки",
          linkedOrderId: "наряд-петрова",
        }),
      },
    ];
    const rows = collectSharedArchivedCards([board], "Смирнов");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.card.linkedOrderId).toBe("наряд-смирнов");
  });
});
