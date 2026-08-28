import { describe, expect, it } from "vitest";
import { shouldSkipCrmKanbanTelegram } from "@/lib/kanban/crm-kanban-telegram";

describe("shouldSkipCrmKanbanTelegram", () => {
  it("не глушит CRM-бота из‑за числового kaitenCardId", () => {
    expect(shouldSkipCrmKanbanTelegram(184_325)).toBe(false);
    expect(shouldSkipCrmKanbanTelegram(null)).toBe(false);
    expect(shouldSkipCrmKanbanTelegram(undefined)).toBe(false);
  });
});
