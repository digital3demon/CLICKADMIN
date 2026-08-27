import { describe, expect, it } from "vitest";
import {
  KANBAN_BOARD_MAX_ZOOM,
  KANBAN_BOARD_MIN_ZOOM,
  kanbanBoardFitZoom,
} from "./crm-layout-tiers";

describe("kanbanBoardFitZoom", () => {
  it("9 колонок на ~1920 (main после сайдбара 1/8) — zoom ниже 0.875, все влезают", () => {
    const main = 1920 * (7 / 8);
    const z = kanbanBoardFitZoom(main, 9);
    expect(z).toBeGreaterThanOrEqual(KANBAN_BOARD_MIN_ZOOM);
    expect(z).toBeLessThan(0.875);
    expect(z).toBeLessThanOrEqual(KANBAN_BOARD_MAX_ZOOM);
  });

  it("9 колонок на ноутбуке 1366 — не уходит ниже пола", () => {
    const main = 1366 * (7 / 8);
    const z = kanbanBoardFitZoom(main, 9);
    expect(z).toBe(KANBAN_BOARD_MIN_ZOOM);
  });

  it("мало колонок на широком экране — не выше потолка", () => {
    expect(kanbanBoardFitZoom(1680, 3)).toBe(KANBAN_BOARD_MAX_ZOOM);
  });

  it("кнопка «Добавить колонку» чуть снижает zoom, 9 столбцов всё ещё в диапазоне", () => {
    const main = 1920 * (7 / 8);
    const withoutBtn = kanbanBoardFitZoom(main, 9);
    const withBtn = kanbanBoardFitZoom(main, 9, 40);
    expect(withBtn).toBeLessThan(withoutBtn);
    expect(withBtn).toBeGreaterThanOrEqual(KANBAN_BOARD_MIN_ZOOM);
  });

  it("пустые входы — 1, не NaN", () => {
    expect(kanbanBoardFitZoom(0, 9)).toBe(1);
    expect(kanbanBoardFitZoom(1680, 0)).toBe(1);
  });
});
