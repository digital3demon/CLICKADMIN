import { describe, expect, it } from "vitest";
import { canUserClearKanbanTimer } from "@/lib/kanban/kanban-timer-permissions";

describe("canUserClearKanbanTimer", () => {
  it("кто поставил — может снять (кириллица в id)", () => {
    expect(
      canUserClearKanbanTimer({
        sessionUserId: "u-всеволод",
        sessionUserRole: "USER",
        timerStartedByUserId: "u-всеволод",
        canManageTimer: false,
      }),
    ).toBe(true);
  });

  it("коллега без старшей роли — не снимает чужой", () => {
    expect(
      canUserClearKanbanTimer({
        sessionUserId: "u-олег",
        sessionUserRole: "USER",
        timerStartedByUserId: "u-всеволод",
        canManageTimer: true,
      }),
    ).toBe(false);
  });

  it("старший техник снимает чужой таймер", () => {
    expect(
      canUserClearKanbanTimer({
        sessionUserId: "u-старший",
        sessionUserRole: "SENIOR_TECHNICIAN",
        timerStartedByUserId: "u-всеволод",
        canManageTimer: false,
      }),
    ).toBe(true);
  });

  it("старый таймер без автора — снимает кто умеет назначать", () => {
    expect(
      canUserClearKanbanTimer({
        sessionUserId: "u-юля",
        sessionUserRole: "USER",
        timerStartedByUserId: null,
        canManageTimer: true,
      }),
    ).toBe(true);
    expect(
      canUserClearKanbanTimer({
        sessionUserId: "u-юля",
        sessionUserRole: "USER",
        timerStartedByUserId: null,
        canManageTimer: false,
      }),
    ).toBe(false);
  });
});
