import { describe, expect, it } from "vitest";
import {
  clearLabMatchedDueDateOnCard,
  clearLabMatchedDueDatesInKanbanState,
} from "@/lib/kanban/clear-kanban-lab-matched-due-dates";
import { defaultAppState } from "@/lib/kanban/model";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";

function card(partial: Partial<KanbanCard>): KanbanCard {
  return {
    id: "c1",
    title: "T",
    description: "",
    cardTypeId: "",
    assignees: [],
    participants: [],
    dueDate: "",
    urgent: false,
    checklist: [],
    files: [],
    comments: [],
    activity: [],
    blocked: false,
    blockReason: "",
    blockedByUserId: "",
    blockedAt: "",
    createdByUserId: "",
    lastMovedAt: null,
    trackLane: "",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...partial,
  };
}

describe("clearLabMatchedDueDateOnCard", () => {
  const orderDue = new Map([["ord1", "2026-07-10"]]);

  it("очищает linked-карточку при совпадении с лаб. сроком", () => {
    const c = card({ linkedOrderId: "ord1", dueDate: "2026-07-10" });
    expect(clearLabMatchedDueDateOnCard(c, orderDue)).toBe(true);
    expect(c.dueDate).toBe("");
  });

  it("сохраняет этапный срок, отличный от лабораторного", () => {
    const c = card({ linkedOrderId: "ord1", dueDate: "2026-07-15" });
    expect(clearLabMatchedDueDateOnCard(c, orderDue)).toBe(false);
    expect(c.dueDate).toBe("2026-07-15");
  });

  it("не трогает standalone без linkedOrderId", () => {
    const c = card({ dueDate: "2026-07-10" });
    expect(clearLabMatchedDueDateOnCard(c, orderDue)).toBe(false);
    expect(c.dueDate).toBe("2026-07-10");
  });

  it("не трогает linked без лаб. срока у наряда", () => {
    const c = card({ linkedOrderId: "ord2", dueDate: "2026-07-10" });
    expect(clearLabMatchedDueDateOnCard(c, orderDue)).toBe(false);
  });
});

describe("clearLabMatchedDueDatesInKanbanState", () => {
  it("обходит archived и stopped", () => {
    const base = structuredClone(defaultAppState()) as KanbanAppState;
    const board = base.boards[0]!;
    const col = board.columns[0]!;
    col.cards = [card({ id: "live", linkedOrderId: "o1", dueDate: "2026-07-01" })];
    board.archivedCards = [
      {
        id: "a1",
        card: card({ id: "arch", linkedOrderId: "o2", dueDate: "2026-08-01" }),
        archivedAt: "",
        deleteAfterAt: "",
        sourceColumnId: col.id,
        sourceColumnTitle: col.title,
        reason: "manual",
      },
    ];
    board.stoppedCards = [
      {
        id: "s1",
        card: card({ id: "stop", linkedOrderId: "o3", dueDate: "2026-09-01" }),
        stoppedAt: "",
        sourceColumnId: col.id,
        sourceColumnTitle: col.title,
      },
    ];
    const orderDue = new Map([
      ["o1", "2026-07-01"],
      ["o2", "2026-08-01"],
      ["o3", "2026-09-15"],
    ]);
    const { state, clearedCount } = clearLabMatchedDueDatesInKanbanState(base, orderDue);
    expect(clearedCount).toBe(2);
    expect(state.boards[0]!.columns[0]!.cards[0]!.dueDate).toBe("");
    expect(state.boards[0]!.archivedCards![0]!.card.dueDate).toBe("");
    expect(state.boards[0]!.stoppedCards![0]!.card.dueDate).toBe("2026-09-01");
  });
});
