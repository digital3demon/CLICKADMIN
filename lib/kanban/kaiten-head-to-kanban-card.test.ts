import { describe, expect, it } from "vitest";
import {
  applyKaitenHeadFieldsToKanbanCard,
  ymdFromKaitenDueDate,
} from "@/lib/kanban/kaiten-head-to-kanban-card";

describe("ymdFromKaitenDueDate", () => {
  it("parses ISO date prefix", () => {
    expect(ymdFromKaitenDueDate("2026-08-04T09:00:00.000Z")).toBe("2026-08-04");
  });

  it("returns null for empty", () => {
    expect(ymdFromKaitenDueDate(null)).toBeNull();
    expect(ymdFromKaitenDueDate("")).toBeNull();
    expect(ymdFromKaitenDueDate(false)).toBeNull();
  });
});

describe("applyKaitenHeadFieldsToKanbanCard", () => {
  it("updates urgent from asap without touching order fields", () => {
    const card = { urgent: false, stageDueDate: "", dueDate: "" };
    expect(applyKaitenHeadFieldsToKanbanCard(card, { asap: true })).toBe(true);
    expect(card.urgent).toBe(true);
  });

  it("sets stage due from due_date", () => {
    const card = { urgent: false, stageDueDate: "", dueDate: "legacy" };
    expect(
      applyKaitenHeadFieldsToKanbanCard(card, { due_date: "2026-08-10T12:00:00Z" }),
    ).toBe(true);
    expect(card.stageDueDate).toBe("2026-08-10");
    expect(card.dueDate).toBe("");
  });

  it("clears stage due when due_date is null", () => {
    const card = { urgent: true, stageDueDate: "2026-08-01", dueDate: "" };
    expect(applyKaitenHeadFieldsToKanbanCard(card, { due_date: null })).toBe(true);
    expect(card.stageDueDate).toBe("");
  });
});
