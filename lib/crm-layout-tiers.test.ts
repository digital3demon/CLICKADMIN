import { describe, expect, it } from "vitest";
import {
  KANBAN_BOARD_MAX_ZOOM,
  KANBAN_BOARD_MIN_ZOOM,
  KANBAN_COL_MIN_VISUAL_PX,
  kanbanBoardColumnVisualWidthPx,
  kanbanBoardFitZoom,
  kanbanBoardNeedsHorizontalScroll,
} from "./crm-layout-tiers";

describe("kanbanBoardFitZoom", () => {
  it("9 колонок на ~1920 (main после сайдбара 1/8) — упирается в пол zoom", () => {
    const main = 1920 * (7 / 8);
    const z = kanbanBoardFitZoom(main, 9);
    expect(z).toBe(KANBAN_BOARD_MIN_ZOOM);
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

  it("кнопка «Добавить колонку» на среднем main снижает zoom", () => {
    const main = 1500;
    const withoutBtn = kanbanBoardFitZoom(main, 7);
    const withBtn = kanbanBoardFitZoom(main, 7, 40);
    expect(withoutBtn).toBeGreaterThan(KANBAN_BOARD_MIN_ZOOM);
    expect(withoutBtn).toBeLessThan(KANBAN_BOARD_MAX_ZOOM);
    expect(withBtn).toBeLessThan(withoutBtn);
    expect(withBtn).toBeGreaterThanOrEqual(KANBAN_BOARD_MIN_ZOOM);
  });

  it("на тесном main 9 колонок — оба варианта на полу zoom", () => {
    const main = 1920 * (7 / 8);
    expect(kanbanBoardFitZoom(main, 9)).toBe(KANBAN_BOARD_MIN_ZOOM);
    expect(kanbanBoardFitZoom(main, 9, 40)).toBe(KANBAN_BOARD_MIN_ZOOM);
  });

  it("пустые входы — 1, не NaN", () => {
    expect(kanbanBoardFitZoom(0, 9)).toBe(1);
    expect(kanbanBoardFitZoom(1680, 0)).toBe(1);
  });
});

describe("kanbanBoardNeedsHorizontalScroll", () => {
  it("узкий main при 125% zoom (≈900 CSS) и 5 колонках — скролл", () => {
    expect(kanbanBoardNeedsHorizontalScroll(900, 5, 40)).toBe(true);
    expect(kanbanBoardColumnVisualWidthPx(900, 5, 40)).toBeLessThan(
      KANBAN_COL_MIN_VISUAL_PX,
    );
  });

  it("широкий main и 5 колонок — без скролла", () => {
    expect(kanbanBoardNeedsHorizontalScroll(1600, 5, 40)).toBe(false);
  });
});
