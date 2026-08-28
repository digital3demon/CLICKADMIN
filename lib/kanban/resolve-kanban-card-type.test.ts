import { describe, expect, it } from "vitest";
import { resolveKanbanBoardCardTypeId } from "@/lib/kanban/resolve-kanban-card-type";

describe("resolveKanbanBoardCardTypeId", () => {
  const board = {
    cardTypes: [
      { id: "kt_spl", name: "Сплинт" },
      { id: "kt_vrem", name: "Временные" },
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
});
