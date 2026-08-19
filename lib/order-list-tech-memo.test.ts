import { describe, expect, it } from "vitest";
import {
  canEditOrderListTechMemo,
  canSendKanbanChatPtMemo,
  canUseKanbanActualAppointmentFilter,
} from "@/lib/auth/permissions";
import { normalizeOrderListTechMemoInput } from "@/lib/order-list-tech-memo";

describe("canEditOrderListTechMemo", () => {
  it("allows admins, senior tech, owner, manager", () => {
    expect(canEditOrderListTechMemo("OWNER")).toBe(true);
    expect(canEditOrderListTechMemo("ADMINISTRATOR")).toBe(true);
    expect(canEditOrderListTechMemo("SENIOR_ADMINISTRATOR")).toBe(true);
    expect(canEditOrderListTechMemo("SENIOR_TECHNICIAN")).toBe(true);
    expect(canEditOrderListTechMemo("MANAGER")).toBe(true);
  });

  it("denies production and accountant", () => {
    expect(canEditOrderListTechMemo("USER")).toBe(false);
    expect(canEditOrderListTechMemo("PRODUCTION")).toBe(false);
    expect(canEditOrderListTechMemo("ACCOUNTANT")).toBe(false);
  });
});

describe("canSendKanbanChatPtMemo", () => {
  it("старший техник, админы, руководитель, владелец", () => {
    expect(canSendKanbanChatPtMemo("SENIOR_TECHNICIAN")).toBe(true);
    expect(canSendKanbanChatPtMemo("ADMINISTRATOR")).toBe(true);
    expect(canSendKanbanChatPtMemo("SENIOR_ADMINISTRATOR")).toBe(true);
    expect(canSendKanbanChatPtMemo("MANAGER")).toBe(true);
    expect(canSendKanbanChatPtMemo("OWNER")).toBe(true);
    expect(canSendKanbanChatPtMemo("USER")).toBe(false);
    expect(canSendKanbanChatPtMemo("PRODUCTION")).toBe(false);
  });
});

describe("canUseKanbanActualAppointmentFilter", () => {
  it("старший техник, админы, руководитель, владелец", () => {
    expect(canUseKanbanActualAppointmentFilter("SENIOR_TECHNICIAN")).toBe(true);
    expect(canUseKanbanActualAppointmentFilter("ADMINISTRATOR")).toBe(true);
    expect(canUseKanbanActualAppointmentFilter("SENIOR_ADMINISTRATOR")).toBe(
      true,
    );
    expect(canUseKanbanActualAppointmentFilter("MANAGER")).toBe(true);
    expect(canUseKanbanActualAppointmentFilter("OWNER")).toBe(true);
    expect(canUseKanbanActualAppointmentFilter("USER")).toBe(false);
    expect(canUseKanbanActualAppointmentFilter("PRODUCTION")).toBe(false);
  });
});

describe("normalizeOrderListTechMemoInput", () => {
  it("keeps cyrillic and trims", () => {
    expect(normalizeOrderListTechMemoInput("  модель на согласе  ")).toBe(
      "модель на согласе",
    );
  });
});
