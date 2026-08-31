import { describe, expect, it } from "vitest";
import { overlayCrmStopColumnTitle } from "@/lib/kanban/crm-stop-column-overlay";
import { KANBAN_STOP_COLUMN_TITLE } from "@/lib/kanban/kanban-stop-column";

describe("overlayCrmStopColumnTitle", () => {
  it("карточка в СТОП на канбане — не «Очередь» с кириллицей вокруг", () => {
    const stopped = new Set(["наряд-2607"]);
    expect(
      overlayCrmStopColumnTitle("наряд-2607", "Очередь", stopped),
    ).toBe(KANBAN_STOP_COLUMN_TITLE);
  });

  it("уже СТОП в поле наряда", () => {
    expect(
      overlayCrmStopColumnTitle("x", "  стоп  ", new Set()),
    ).toBe(KANBAN_STOP_COLUMN_TITLE);
  });

  it("обычная колонка без парковки", () => {
    expect(
      overlayCrmStopColumnTitle("x", "Очередь", new Set()),
    ).toBe("Очередь");
  });
});
