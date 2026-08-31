import { describe, expect, it } from "vitest";
import {
  KANBAN_CARD_MODAL_STOP_COLUMN_ID,
  interpretKanbanPlacementColumnPick,
} from "@/lib/kanban/kanban-placement-column-pick";

describe("interpretKanbanPlacementColumnPick", () => {
  it("тот же столбец — noop, кириллица в id", () => {
    expect(
      interpretKanbanPlacementColumnPick("кол-сдача-админам", "кол-сдача-админам"),
    ).toEqual({ kind: "noop" });
  });

  it("СТОП — отдельное действие, не колонка", () => {
    expect(
      interpretKanbanPlacementColumnPick(
        KANBAN_CARD_MODAL_STOP_COLUMN_ID,
        "кол-сдача-админам",
      ),
    ).toEqual({ kind: "stop" });
  });

  it("другой столбец после «Сдана админам»", () => {
    expect(
      interpretKanbanPlacementColumnPick("кол-сборка", "кол-сдача-админам"),
    ).toEqual({ kind: "column", columnId: "кол-сборка" });
  });
});
