import { describe, expect, it } from "vitest";
import {
  applyKanbanAutomations,
  extractKanbanAutomations,
  normalizeKanbanAutomations,
} from "@/lib/kanban/automations-sync";
import { defaultAppState } from "@/lib/kanban/model";
import type { KanbanAutomationRule } from "@/lib/kanban/types";

function sampleRule(name: string): KanbanAutomationRule {
  return {
    id: "auto-юля-1",
    enabled: true,
    name,
    boardId: "kanban-board-клиника-юли",
    trigger: "card_moved_to_column",
    columnId: "col-к-исполнению",
    fromColumnId: "",
    cardTypeId: "",
    actions: [{ type: "add_comment", text: "Срок для Юли" }],
  };
}

describe("kanban automations snapshot", () => {
  it("extract / apply сохраняет кириллическое правило на все доски", () => {
    const state = defaultAppState();
    state.boards[0]!.automations = [sampleRule("Когда Юля сдаёт")];
    const snap = extractKanbanAutomations(state);
    expect(snap.rules).toHaveLength(1);
    expect(snap.rules[0]?.name).toBe("Когда Юля сдаёт");
    expect(snap.rules[0]?.actions[0]).toEqual({
      type: "add_comment",
      text: "Срок для Юли",
    });

    const empty = defaultAppState();
    const applied = applyKanbanAutomations(empty, snap);
    for (const board of applied.boards) {
      expect(board.automations?.[0]?.name).toBe("Когда Юля сдаёт");
      expect(board.automations?.[0]?.boardId).toBe("kanban-board-клиника-юли");
    }
  });

  it("битый payload не затирает уже лежащие правила", () => {
    const state = defaultAppState();
    state.boards[0]!.automations = [sampleRule("Не трогать")];
    const next = applyKanbanAutomations(state, { version: 2, rules: [] });
    expect(next.boards[0]!.automations?.[0]?.name).toBe("Не трогать");
    expect(normalizeKanbanAutomations(null)).toBeNull();
    expect(normalizeKanbanAutomations("авто")).toBeNull();
  });

  it("пустой валидный снимок снимает правила (удалили все)", () => {
    const state = defaultAppState();
    state.boards[0]!.automations = [sampleRule("Удалить")];
    const next = applyKanbanAutomations(state, { version: 1, rules: [] });
    expect(next.boards[0]!.automations).toEqual([]);
  });

  it("несколько типов карточки сохраняются в снимке (кириллица)", () => {
    const state = defaultAppState();
    state.boards[0]!.automations = [
      {
        id: "auto-типы-юля",
        enabled: true,
        name: "Коронка и сплинт Юли",
        boardId: "kanban-board-клиника-юли",
        trigger: "card_created_in_column",
        columnId: "",
        fromColumnId: "",
        cardTypeId: "",
        cardTypeIds: ["тип-коронка", "тип-сплинт"],
        actions: [{ type: "add_comment", text: "тип Юли" }],
      },
    ];
    const snap = extractKanbanAutomations(state);
    expect(snap.rules[0]?.cardTypeIds).toEqual(["тип-коронка", "тип-сплинт"]);
    expect(snap.rules[0]?.cardTypeId).toBe("тип-коронка");
    const applied = applyKanbanAutomations(defaultAppState(), snap);
    expect(applied.boards[0]!.automations?.[0]?.cardTypeIds).toEqual([
      "тип-коронка",
      "тип-сплинт",
    ]);
  });

  it("архив через 48 часов сохраняется в снимке (кириллица в id)", () => {
    const state = defaultAppState();
    state.boards[0]!.automations = [
      {
        id: "auto-архив-юля",
        enabled: true,
        name: "Сдана админам → архив",
        boardId: "kanban-board-клиника-юли",
        trigger: "card_moved_to_column",
        columnId: "col-сдана-админам",
        fromColumnId: "",
        cardTypeId: "",
        actions: [{ type: "archive", afterHours: 48 }],
      },
    ];
    const snap = extractKanbanAutomations(state);
    expect(snap.rules[0]?.actions[0]).toEqual({ type: "archive", afterHours: 48 });
    const applied = applyKanbanAutomations(defaultAppState(), snap);
    expect(applied.boards[0]!.automations?.[0]?.actions[0]).toEqual({
      type: "archive",
      afterHours: 48,
    });
  });
});
