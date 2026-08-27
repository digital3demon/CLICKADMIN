import { describe, expect, it } from "vitest";
import { defaultAppState } from "@/lib/kanban/model";
import { getKanbanStageDue, setKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import {
  applyKanbanCardHeadsCache,
  collectKanbanCardHeadsCache,
} from "./kanban-card-heads-cache";

describe("kanban card heads cache", () => {
  it("возвращает людей и срок на пустую карточку того же наряда", () => {
    const state = defaultAppState();
    const board = state.boards[0]!;
    const col = board.columns[0]!;
    col.cards.push({
      id: "kaiten-order-oid-1",
      title: "2608-363 Гронский Л. Заитова",
      assignees: ["u-саша"],
      participants: [],
      stageDueDate: "2026-09-08",
      dueDate: "",
      linkedOrderId: "oid-1",
    } as never);
    const heads = collectKanbanCardHeadsCache(state);
    expect(heads["oid:oid-1"]?.assignees).toEqual(["u-саша"]);
    expect(heads["oid:oid-1"]?.stageDue).toBe("2026-09-08");

    const empty = defaultAppState();
    empty.boards[0]!.columns[0]!.cards.push({
      id: "kaiten-order-oid-1",
      title: "2608-363 Гронский Л. Заитова",
      assignees: [],
      participants: [],
      stageDueDate: "",
      dueDate: "",
      linkedOrderId: "oid-1",
    } as never);
    expect(applyKanbanCardHeadsCache(empty, heads)).toBe(true);
    const card = empty.boards[0]!.columns[0]!.cards[0]!;
    expect(card.assignees).toEqual(["u-саша"]);
    expect(getKanbanStageDue(card)).toBe("2026-09-08");
    setKanbanStageDue(card, "2026-09-08");
  });
});
