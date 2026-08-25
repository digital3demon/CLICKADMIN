import { describe, expect, it } from "vitest";
import { canonicalizeKanbanChatTriggerMessage } from "./chat-trigger-message";

describe("canonicalizeKanbanChatTriggerMessage", () => {
  it("кнопка корректировки один раз ставит !!! (кириллица вокруг)", () => {
    expect(canonicalizeKanbanChatTriggerMessage("correction", "срок от 10.02.2026")).toBe(
      "!!! срок от 10.02.2026",
    );
    expect(
      canonicalizeKanbanChatTriggerMessage("correction", "!!! срок от 10.02.2026"),
    ).toBe("!!! срок от 10.02.2026");
  });

  it("кнопка протетики один раз ставит ???", () => {
    expect(canonicalizeKanbanChatTriggerMessage("prosthetics", "коронка на 16")).toBe(
      "??? коронка на 16",
    );
    expect(
      canonicalizeKanbanChatTriggerMessage("prosthetics", "??? коронка на 16"),
    ).toBe("??? коронка на 16");
  });

  it("обычный комментарий не превращает набор !!! в заявку", () => {
    expect(canonicalizeKanbanChatTriggerMessage("comment", "!!! просто текст")).toBe(
      "!!! просто текст",
    );
  });
});
