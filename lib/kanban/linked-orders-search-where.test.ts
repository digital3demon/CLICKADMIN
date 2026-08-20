import { describe, expect, it } from "vitest";
import { kanbanLinkedOrderNumberSuffixContains } from "@/lib/kanban/linked-orders-search-where";

describe("kanbanLinkedOrderNumberSuffixContains", () => {
  it("для 299 даёт суффикс -299, кириллица вокруг в UI не в каноне БД", () => {
    expect(kanbanLinkedOrderNumberSuffixContains("299")).toBe("-299");
    expect(kanbanLinkedOrderNumberSuffixContains("  079  ")).toBe("-079");
    expect(kanbanLinkedOrderNumberSuffixContains("2607-299")).toBeNull();
  });

  it("двузначные не считает суффиксом наряда", () => {
    expect(kanbanLinkedOrderNumberSuffixContains("14")).toBeNull();
    expect(kanbanLinkedOrderNumberSuffixContains("степ")).toBeNull();
  });
});
