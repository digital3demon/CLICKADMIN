import { describe, expect, it } from "vitest";
import {
  applyEditedKanbanChatText,
  canAuthorMutateKanbanChatMessage,
  KANBAN_CHAT_AUTHOR_EDIT_WINDOW_MS,
} from "./chat-message-edit";

describe("canAuthorMutateKanbanChatMessage", () => {
  const createdAt = "2026-08-25T00:00:00.000Z";
  const t0 = Date.parse(createdAt);

  it("только автор в окне 12 часов, кириллица в соседнем тексте не мешает", () => {
    expect(
      canAuthorMutateKanbanChatMessage({
        userId: "u1",
        currentUserId: "u1",
        createdAt,
        nowMs: t0 + 60 * 60 * 1000,
      }),
    ).toBe(true);
    expect(
      canAuthorMutateKanbanChatMessage({
        userId: "u1",
        currentUserId: "u2",
        createdAt,
        nowMs: t0 + 1000,
      }),
    ).toBe(false);
    expect(
      canAuthorMutateKanbanChatMessage({
        userId: "u1",
        currentUserId: "u1",
        createdAt,
        nowMs: t0 + KANBAN_CHAT_AUTHOR_EDIT_WINDOW_MS + 1,
      }),
    ).toBe(false);
    expect(
      canAuthorMutateKanbanChatMessage({
        userId: "u1",
        currentUserId: "u1",
        createdAt,
        nowMs: t0 + 60 * 60 * 1000,
        requestClosed: true,
      }),
    ).toBe(false);
  });
});

describe("applyEditedKanbanChatText", () => {
  it("сохраняет !!! и кириллицу до/после правки", () => {
    expect(applyEditedKanbanChatText("!!! Нужен срок", "Новый срок от 10.02.2026")).toBe(
      "!!! Новый срок от 10.02.2026",
    );
    expect(applyEditedKanbanChatText("просто", "вторая\nстрока")).toBe("вторая\nстрока");
  });
});
