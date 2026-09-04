import { describe, expect, it } from "vitest";
import {
  KANBAN_CARD_MODAL_NARROW_MAX_PX,
  kanbanCardDescriptionAvailableHeight,
  kanbanCardDescriptionForceCollapseOnNarrow,
  kanbanCardDescriptionNeedsCollapse,
} from "@/lib/kanban/kanban-card-desc-collapse";

describe("kanbanCardDescriptionNeedsCollapse", () => {
  it("не сворачивает, если описание влезает в остаток окна", () => {
    expect(kanbanCardDescriptionNeedsCollapse(180, 420)).toBe(false);
    expect(kanbanCardDescriptionNeedsCollapse(700, 900)).toBe(false);
  });

  it("сворачивает, если полный текст выше остатка окна", () => {
    expect(kanbanCardDescriptionNeedsCollapse(500, 220)).toBe(true);
    expect(kanbanCardDescriptionNeedsCollapse(980, 900)).toBe(true);
  });

  it("не сворачивает при нулевой высоте (ещё нет вёрстки)", () => {
    expect(kanbanCardDescriptionNeedsCollapse(200, 0)).toBe(false);
  });
});

describe("kanbanCardDescriptionForceCollapseOnNarrow", () => {
  it("на телефоне сворачивает непустое описание", () => {
    expect(kanbanCardDescriptionForceCollapseOnNarrow(true, true)).toBe(true);
    expect(kanbanCardDescriptionForceCollapseOnNarrow(true, false)).toBe(false);
  });

  it("на десктопе не форсирует сворачивание", () => {
    expect(kanbanCardDescriptionForceCollapseOnNarrow(false, true)).toBe(false);
  });
});

describe("KANBAN_CARD_MODAL_NARROW_MAX_PX", () => {
  it("совпадает с порогом drawer (не sm 639)", () => {
    expect(KANBAN_CARD_MODAL_NARROW_MAX_PX).toBe(1023);
  });
});

describe("kanbanCardDescriptionAvailableHeight", () => {
  it("считает место от верха описания до низа оверлея, не от всей модалки", () => {
    expect(kanbanCardDescriptionAvailableHeight(900, 280)).toBe(900 - 280 - 88);
  });
});
