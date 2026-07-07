import { describe, expect, it } from "vitest";
import type { KanbanCard } from "@/lib/kanban/types";
import { canUserManageKanbanBlockForCard } from "@/lib/kanban-block-permissions";

const card = {
  id: "c1",
  title: "Test",
  description: "",
  cardTypeId: "t1",
  assignees: ["u-participant"],
  participants: [],
  dueDate: "",
  comments: [],
  files: [],
  checklist: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as KanbanCard;

describe("canUserManageKanbanBlockForCard", () => {
  it("без KANBAN_MANAGE_BLOCK — нельзя", () => {
    expect(
      canUserManageKanbanBlockForCard("u-participant", "USER", card, {
        KANBAN_MANAGE_BLOCK: false,
      }),
    ).toBe(false);
  });

  it("USER-участник с модулем — может", () => {
    expect(
      canUserManageKanbanBlockForCard("u-participant", "USER", card, {
        KANBAN_MANAGE_BLOCK: true,
      }),
    ).toBe(true);
  });

  it("SENIOR_TECHNICIAN с модулем — может без участия в карточке", () => {
    expect(
      canUserManageKanbanBlockForCard("u-senior", "SENIOR_TECHNICIAN", card, {
        KANBAN_MANAGE_BLOCK: true,
      }),
    ).toBe(true);
  });
});
