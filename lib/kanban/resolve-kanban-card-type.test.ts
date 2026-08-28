import { describe, expect, it } from "vitest";
import {
  ensureKanbanBoardCardType,
  resolveKanbanBoardCardTypeId,
} from "@/lib/kanban/resolve-kanban-card-type";

describe("resolveKanbanBoardCardTypeId", () => {
  const board = {
    cardTypes: [
      { id: "kt_spl", name: "Сплинт" },
      { id: "kt_vrem", name: "Временные" },
      { id: "kt_mod", name: "Модели" },
    ],
  };

  it("берёт тип доски по имени, даже если id наряда другой (кириллица)", () => {
    expect(
      resolveKanbanBoardCardTypeId(board, {
        cardTypeId: "cuid-из-наряда",
        cardTypeName: "Сплинт",
      }),
    ).toBe("kt_spl");
  });

  it("совпадающий id на доске", () => {
    expect(
      resolveKanbanBoardCardTypeId(board, {
        cardTypeId: "kt_vrem",
        cardTypeName: null,
      }),
    ).toBe("kt_vrem");
  });

  it("чужой id без имени не подставляет", () => {
    expect(
      resolveKanbanBoardCardTypeId(board, {
        cardTypeId: "cuid-чужой",
        cardTypeName: "",
      }),
    ).toBe("");
  });

  it("«Моделировка» не склеивается с «Модели»", () => {
    expect(
      resolveKanbanBoardCardTypeId(board, {
        cardTypeId: "cuid-мод",
        cardTypeName: "Моделировка",
      }),
    ).toBe("");
  });

  it("legacy kt_* без имени", () => {
    expect(
      resolveKanbanBoardCardTypeId(board, {
        cardTypeId: "kt_spl",
        cardTypeName: null,
      }),
    ).toBe("kt_spl");
  });
});

describe("ensureKanbanBoardCardType", () => {
  it("добавляет тип с заказа, которого нет на доске (кириллица)", () => {
    const board = { cardTypes: [{ id: "kt_spl", name: "Сплинт" }] };
    const id = ensureKanbanBoardCardType(board, {
      cardTypeId: "cuid-ключ",
      cardTypeName: "Ключ",
    });
    expect(id).toBe("cuid-ключ");
    expect(board.cardTypes.some((t) => t.name === "Ключ")).toBe(true);
  });

  it("заголовок «Моделировка + Ключ» не создаёт тип", () => {
    const board = { cardTypes: [{ id: "kt_spl", name: "Сплинт" }] };
    const id = ensureKanbanBoardCardType(board, {
      cardTypeId: "cuid-х",
      cardTypeName: null,
      cardTypeTitleLabel: "Моделировка + Ключ",
    });
    expect(id).toBe("");
    expect(board.cardTypes).toHaveLength(1);
  });
});
