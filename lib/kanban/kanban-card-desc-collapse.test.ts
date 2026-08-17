import { describe, expect, it } from "vitest";
import { kanbanCardDescriptionNeedsCollapse } from "@/lib/kanban/kanban-card-desc-collapse";

describe("kanbanCardDescriptionNeedsCollapse", () => {
  it("не сворачивает, если карточка с полным описанием влезает в окно", () => {
    expect(kanbanCardDescriptionNeedsCollapse(700, 900)).toBe(false);
  });

  it("сворачивает, если полное описание уводит карточку ниже экрана", () => {
    expect(kanbanCardDescriptionNeedsCollapse(980, 900)).toBe(true);
  });
});
