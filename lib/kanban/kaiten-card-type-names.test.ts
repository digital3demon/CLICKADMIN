import { describe, expect, it } from "vitest";
import {
  canonicalKanbanCardTypeNameKey,
  findKanbanCardTypeIdByName,
  kanbanCardTypeNamesMatch,
} from "@/lib/kanban/kaiten-card-type-names";

describe("kaiten-card-type-names", () => {
  it("Моделировка и Модели — разные типы, кириллица до и после", () => {
    expect(canonicalKanbanCardTypeNameKey("  Моделировка  ")).toBe("моделировка");
    expect(kanbanCardTypeNamesMatch("Моделировка", "Модели")).toBe(false);
    const types = [
      { id: "kt_mod", name: "Модели" },
      { id: "kt_vrem", name: "Временные" },
    ];
    expect(findKanbanCardTypeIdByName(types, "тип Моделировка после")).toBe("");
    expect(findKanbanCardTypeIdByName(types, "Моделировка")).toBe("");
    expect(findKanbanCardTypeIdByName(types, "Модели")).toBe("kt_mod");
    expect(findKanbanCardTypeIdByName(types, "временная")).toBe("kt_vrem");
  });
});
