import { describe, expect, it } from "vitest";
import { collectSharedStoppedCards } from "@/lib/kanban/collect-shared-stopped-cards";
import { createCard, defaultAppState } from "@/lib/kanban/model";

describe("collectSharedStoppedCards", () => {
  it("берёт чужие карточки наравне со своими (кириллица в id)", () => {
    const state = defaultAppState();
    const board = state.boards[0]!;
    board.stoppedCards = [
      {
        id: "stop-я",
        stoppedAt: "2026-08-28T10:00:00.000Z",
        sourceColumnId: board.columns[0]!.id,
        sourceColumnTitle: board.columns[0]!.title,
        card: createCard({
          id: "card-моя",
          title: "наряд 178 от 10.02.2026 Смирнов",
          linkedOrderId: "наряд-178",
          assignees: ["u-я"],
        }),
      },
      {
        id: "stop-коллега",
        stoppedAt: "2026-08-29T10:00:00.000Z",
        sourceColumnId: board.columns[0]!.id,
        sourceColumnTitle: board.columns[0]!.title,
        card: createCard({
          id: "card-чужая",
          title: "наряд 179 от 11.02.2026 Петрова",
          linkedOrderId: "наряд-179",
          assignees: ["u-коллега"],
        }),
      },
    ];
    const rows = collectSharedStoppedCards([board]);
    expect(rows.map((r) => r.card.linkedOrderId)).toEqual([
      "наряд-179",
      "наряд-178",
    ]);
  });

  it("поиск по кириллице не прячет соседние карточки вне запроса", () => {
    const state = defaultAppState();
    const board = state.boards[0]!;
    board.stoppedCards = [
      {
        id: "s1",
        stoppedAt: "2026-08-28T10:00:00.000Z",
        sourceColumnId: board.columns[0]!.id,
        sourceColumnTitle: board.columns[0]!.title,
        card: createCard({
          id: "c1",
          title: "заказ Смирнов до правки",
          linkedOrderId: "наряд-смирнов",
        }),
      },
      {
        id: "s2",
        stoppedAt: "2026-08-29T10:00:00.000Z",
        sourceColumnId: board.columns[0]!.id,
        sourceColumnTitle: board.columns[0]!.title,
        card: createCard({
          id: "c2",
          title: "заказ Петрова после правки",
          linkedOrderId: "наряд-петрова",
        }),
      },
    ];
    const rows = collectSharedStoppedCards([board], "Смирнов");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.card.linkedOrderId).toBe("наряд-смирнов");
  });

  it("keep «Мои» оставляет только свои (кириллица в id)", () => {
    const state = defaultAppState();
    const board = state.boards[0]!;
    board.stoppedCards = [
      {
        id: "stop-я",
        stoppedAt: "2026-08-28T10:00:00.000Z",
        sourceColumnId: board.columns[0]!.id,
        sourceColumnTitle: board.columns[0]!.title,
        card: createCard({
          id: "card-моя",
          title: "наряд Смирнов",
          linkedOrderId: "наряд-мой",
          assignees: ["u-я"],
        }),
      },
      {
        id: "stop-коллега",
        stoppedAt: "2026-08-29T10:00:00.000Z",
        sourceColumnId: board.columns[0]!.id,
        sourceColumnTitle: board.columns[0]!.title,
        card: createCard({
          id: "card-чужая",
          title: "наряд Петрова",
          linkedOrderId: "наряд-чужой",
          assignees: ["u-коллега"],
        }),
      },
    ];
    const rows = collectSharedStoppedCards([board], "", (card) =>
      (card.assignees || []).includes("u-я"),
    );
    expect(rows.map((r) => r.card.linkedOrderId)).toEqual(["наряд-мой"]);
  });
});
