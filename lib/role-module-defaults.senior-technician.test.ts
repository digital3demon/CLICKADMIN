import { describe, expect, it } from "vitest";
import { defaultModuleAllowed } from "@/lib/role-module-defaults";

describe("SENIOR_TECHNICIAN kanban defaults", () => {
  it("может управлять ответственными, участниками и полями карточки", () => {
    for (const module of [
      "KANBAN",
      "KANBAN_MOVE_COLUMNS",
      "KANBAN_CARD_CHAT",
      "KANBAN_EDIT_TITLE",
      "KANBAN_EDIT_DUE_DATE",
      "KANBAN_EDIT_TRACK",
      "KANBAN_MANAGE_ASSIGNEES",
      "KANBAN_MANAGE_PARTICIPANTS",
      "KANBAN_MANAGE_CHECKLIST",
      "KANBAN_MANAGE_TIMER",
      "KANBAN_ATTACH_FILES",
      "KANBAN_STOP",
      "KANBAN_MANAGE_BLOCK",
      "KANBAN_DELETE_CARD",
    ] as const) {
      expect(defaultModuleAllowed("SENIOR_TECHNICIAN", module)).toBe(true);
    }
  });

  it("не получает ORDERS_EDIT и раздельные уведомления по нарядам по умолчанию", () => {
    expect(defaultModuleAllowed("SENIOR_TECHNICIAN", "ORDERS_EDIT")).toBe(false);
    expect(defaultModuleAllowed("SENIOR_TECHNICIAN", "ORDERS_NOTIFICATIONS_ADMIN")).toBe(
      false,
    );
    expect(
      defaultModuleAllowed("SENIOR_TECHNICIAN", "ORDERS_NOTIFICATIONS_CORRECTIONS"),
    ).toBe(false);
    expect(
      defaultModuleAllowed("SENIOR_TECHNICIAN", "ORDERS_NOTIFICATIONS_PROSTHETICS"),
    ).toBe(false);
  });
});
