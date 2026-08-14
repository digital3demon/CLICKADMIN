import { describe, expect, it } from "vitest";
import {
  foldKanbanSearchText,
  kanbanCardMatchesSearch,
  kanbanSearchTokens,
} from "@/lib/kanban/kanban-card-search";
import { createCard } from "@/lib/kanban/model";
import type { KanbanBoard } from "@/lib/kanban/types";

function boardWithType(name: string): KanbanBoard {
  return {
    id: "b",
    title: "Ортопедия",
    columns: [],
    users: [],
    cardTypes: [{ id: "t-temp", name, color: "#888", sortOrder: 0 }],
  };
}

describe("foldKanbanSearchText", () => {
  it("сводит ё и латинские омонимы к кириллице", () => {
    expect(foldKanbanSearchText("Орлов")).toBe(foldKanbanSearchText("орлов"));
    // латинская o в середине «орлoв» — как кириллическая
    expect(foldKanbanSearchText("орлoв")).toBe(foldKanbanSearchText("орлов"));
    expect(foldKanbanSearchText("Ёлкин")).toContain("елкин");
  });
});

describe("kanbanSearchTokens", () => {
  it("режет по пробелу, кириллица до и после токена", () => {
    expect(kanbanSearchTokens("  2608-119   орлов  ")).toEqual([
      foldKanbanSearchText("2608-119"),
      foldKanbanSearchText("орлов"),
    ]);
  });
});

describe("kanbanCardMatchesSearch", () => {
  it("находит фамилию в заголовке при кириллице вокруг", () => {
    const card = createCard({
      id: "c1",
      title: "2608-119 Орлов Ю. Енькова А.А. Временные 13.08",
    });
    expect(kanbanCardMatchesSearch(card, "орлов")).toBe(true);
    expect(kanbanCardMatchesSearch(card, "2608 орлов")).toBe(true);
    expect(kanbanCardMatchesSearch(card, "петров")).toBe(false);
  });

  it("находит при латинской o в запросе", () => {
    const card = createCard({
      id: "c2",
      title: "2608-119 Орлов Ю. Енькова А.А. Временные 13.08",
    });
    expect(kanbanCardMatchesSearch(card, "орлoв")).toBe(true);
  });

  it("ищет в комментарии, если заголовка недостаточно", () => {
    const card = createCard({
      id: "c3",
      title: "2608-119",
      comments: [
        {
          id: "cm1",
          userId: "u",
          text: "пациент Орлов, согласовать цвет",
          createdAt: "2026-08-14T00:00:00.000Z",
        },
      ],
    });
    expect(kanbanCardMatchesSearch(card, "орлов")).toBe(true);
  });

  it("учитывает тип карточки", () => {
    const card = createCard({
      id: "c4",
      title: "2608-119 Орлов",
      cardTypeId: "t-temp",
    });
    const board = boardWithType("Временные");
    expect(kanbanCardMatchesSearch(card, "временные", board)).toBe(true);
    expect(kanbanCardMatchesSearch(card, "постоянные", board)).toBe(false);
  });
});
