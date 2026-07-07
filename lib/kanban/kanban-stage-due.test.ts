import { describe, expect, it } from "vitest";
import {
  applyKanbanLegacyStageDueClearMigration,
  clearAllKanbanStageDueDatesInKanbanState,
  clearKanbanStageDue,
  getKanbanStageDue,
  KANBAN_LEGACY_STAGE_DUE_CLEAR_VERSION,
  setKanbanStageDue,
} from "@/lib/kanban/kanban-stage-due";
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

describe("kanban stage due field access", () => {
  it("читает stageDueDate, иначе legacy dueDate", () => {
    expect(getKanbanStageDue(card({ stageDueDate: "2026-07-15" }))).toBe("2026-07-15");
    expect(getKanbanStageDue(card({ dueDate: "2026-07-10" }))).toBe("2026-07-10");
    expect(getKanbanStageDue(card({ stageDueDate: "2026-07-20", dueDate: "2026-07-10" }))).toBe(
      "2026-07-20",
    );
  });

  it("setKanbanStageDue пишет stageDueDate и сбрасывает legacy dueDate", () => {
    const c = card({ dueDate: "2026-07-10" });
    setKanbanStageDue(c, "2026-08-01");
    expect(c.stageDueDate).toBe("2026-08-01");
    expect(c.dueDate).toBe("");
    expect(getKanbanStageDue(c)).toBe("2026-08-01");
  });

  it("clearKanbanStageDue очищает оба поля", () => {
    const c = card({ stageDueDate: "2026-07-01", dueDate: "2026-07-02" });
    expect(clearKanbanStageDue(c)).toBe(true);
    expect(c.stageDueDate).toBe("");
    expect(c.dueDate).toBe("");
  });
});

describe("clearAllKanbanStageDueDatesInKanbanState", () => {
  it("очищает только карточки канбана", () => {
    const base = structuredClone(defaultAppState()) as KanbanAppState;
    const col = base.boards[0]!.columns[0]!;
    col.cards = [
      card({ id: "a", dueDate: "2026-07-30" }),
      card({ id: "b", stageDueDate: "2026-07-01" }),
      card({ id: "c" }),
    ];
    const { state, clearedCount } = clearAllKanbanStageDueDatesInKanbanState(base);
    expect(clearedCount).toBe(2);
    expect(getKanbanStageDue(state.boards[0]!.columns[0]!.cards[0]!)).toBe("");
    expect(getKanbanStageDue(state.boards[0]!.columns[0]!.cards[1]!)).toBe("");
  });
});

describe("applyKanbanLegacyStageDueClearMigration", () => {
  it("один раз очищает и ставит флаг", () => {
    const base = structuredClone(defaultAppState()) as KanbanAppState;
    base.boards[0]!.columns[0]!.cards = [card({ dueDate: "2026-07-10" })];
    const first = applyKanbanLegacyStageDueClearMigration(base);
    expect(first.changed).toBe(true);
    expect(first.clearedCount).toBe(1);
    expect(first.state.legacyStageDueClearVersion).toBe(KANBAN_LEGACY_STAGE_DUE_CLEAR_VERSION);
    setKanbanStageDue(first.state.boards[0]!.columns[0]!.cards[0]!, "2026-08-01");
    const second = applyKanbanLegacyStageDueClearMigration(first.state);
    expect(second.changed).toBe(false);
    expect(getKanbanStageDue(second.state.boards[0]!.columns[0]!.cards[0]!)).toBe("2026-08-01");
  });
});
