import { describe, expect, it } from "vitest";
import {
  isKanbanAdminGroupRole,
  isKanbanLabMentionNotifyRole,
} from "@/lib/kanban-admin-mention";

describe("kanban-admin-mention roles", () => {
  it("@ClickLab — только админы, владелец не в рассылке группы", () => {
    expect(isKanbanAdminGroupRole("OWNER")).toBe(false);
    expect(isKanbanLabMentionNotifyRole("OWNER")).toBe(false);
    expect(isKanbanLabMentionNotifyRole("ADMINISTRATOR")).toBe(true);
    expect(isKanbanLabMentionNotifyRole("SENIOR_ADMINISTRATOR")).toBe(true);
    expect(isKanbanLabMentionNotifyRole("PRODUCTION")).toBe(false);
  });
});
