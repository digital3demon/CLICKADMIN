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

  it("цифровой запрос 214 не цепляет дату 14.08 и кириллицу вокруг", () => {
    const miss = createCard({
      id: "c-date",
      title: "2607-392 Сторожук Д. Ерунова О.В. Сплинт МРТ 14.08",
    });
    const hit = createCard({
      id: "c-num",
      title: "2608-214 Лихачева М. Амирханова ап.Шварца 27.08 09:00",
    });
    expect(kanbanCardMatchesSearch(miss, "214")).toBe(false);
    expect(kanbanCardMatchesSearch(hit, "214")).toBe(true);
    expect(kanbanCardMatchesSearch(hit, "2608-214")).toBe(true);
  });

  it("цифровой 079 находит суффикс номера наряда, кириллица вокруг", () => {
    const hyphen = createCard({
      id: "c-079",
      title: "2605-079 Тетеркина В. Династия 12.05 09:00",
    });
    const glued = createCard({
      id: "c-079g",
      title: "наряд 2606079 Кюлян Э.Н. коррекция",
    });
    expect(kanbanCardMatchesSearch(hyphen, "079")).toBe(true);
    expect(kanbanCardMatchesSearch(glued, "079")).toBe(true);
    expect(kanbanCardMatchesSearch(hyphen, "14")).toBe(false);
  });

  it("299 находит 2607-299 Степанов, даже если номер только в linkedOrderNumber", () => {
    const titled = createCard({
      id: "c-299",
      title: "2607-299 Степанов А.В. Жевлаков А. ХШ + Нагрузка 24.08 09:00",
      linkedOrderId: "ord-299",
    });
    const kaitenTitle = createCard({
      id: "c-299-k",
      title: "Степанов А.В. Жевлаков А. ХШ + Нагрузка 24.08 09:00",
      linkedOrderId: "ord-299-k",
      linkedOrderNumber: "2607-299",
    });
    expect(kanbanCardMatchesSearch(titled, "299")).toBe(true);
    expect(kanbanCardMatchesSearch(titled, "степ")).toBe(true);
    expect(kanbanCardMatchesSearch(kaitenTitle, "299")).toBe(true);
    expect(kanbanCardMatchesSearch(kaitenTitle, "степанов")).toBe(true);
  });

  it("не ищет по внутреннему id наряда", () => {
    const card = createCard({
      id: "c-id",
      title: "2607-392 Сторожук Д. Ерунова О.В. Сплинт МРТ 14.08",
      linkedOrderId: "order_cuid_214_hidden",
    });
    expect(kanbanCardMatchesSearch(card, "214")).toBe(false);
  });

  it("вставка названия из документооборота находит карточку с Н.Э. без пробелов", () => {
    const card = createCard({
      id: "c-doc-copy",
      title: "Загоскина Я. Самус Н.Э. Сплинт 28.08",
      linkedOrderId: "ord-загоскина",
      linkedOrderNumber: "2608-325",
    });
    expect(
      kanbanCardMatchesSearch(card, "2608-325 Загоскина Я. Самус Н. Э."),
    ).toBe(true);
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
