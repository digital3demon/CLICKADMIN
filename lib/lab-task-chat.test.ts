import { describe, expect, it } from "vitest";
import {
  canMutateLabTaskChatMessage,
  LAB_TASK_CHAT_EDIT_WINDOW_MS,
  labTaskChatHasUnread,
  labTaskChatPreviewText,
} from "@/lib/lab-task-chat";

describe("canMutateLabTaskChatMessage", () => {
  const createdAt = "2026-08-28T17:00:00.000Z";

  it("автор правит своё в течение часа", () => {
    expect(
      canMutateLabTaskChatMessage({
        authorUserId: "u1",
        viewerUserId: "u1",
        createdAt,
        nowMs: Date.parse(createdAt) + 30 * 60 * 1000,
      }),
    ).toBe(true);
  });

  it("после часа и чужое — нельзя", () => {
    expect(
      canMutateLabTaskChatMessage({
        authorUserId: "u1",
        viewerUserId: "u1",
        createdAt,
        nowMs: Date.parse(createdAt) + LAB_TASK_CHAT_EDIT_WINDOW_MS + 1,
      }),
    ).toBe(false);
    expect(
      canMutateLabTaskChatMessage({
        authorUserId: "u1",
        viewerUserId: "u2",
        createdAt,
        nowMs: Date.parse(createdAt) + 1000,
      }),
    ).toBe(false);
  });
});

describe("labTaskChatHasUnread", () => {
  it("янтарь: чужое после просмотра, кириллица в подписи не влияет", () => {
    expect(
      labTaskChatHasUnread({
        viewerUserId: "марк",
        seenAt: "2026-08-28T16:00:00.000Z",
        comments: [
          {
            authorUserId: "сева",
            createdAt: "2026-08-28T17:05:00.000Z",
          },
        ],
      }),
    ).toBe(true);
  });

  it("серое: нет сообщений или только свои", () => {
    expect(
      labTaskChatHasUnread({
        viewerUserId: "марк",
        seenAt: null,
        comments: [],
      }),
    ).toBe(false);
    expect(
      labTaskChatHasUnread({
        viewerUserId: "марк",
        seenAt: null,
        comments: [{ authorUserId: "марк", createdAt: "2026-08-28T17:00:00.000Z" }],
      }),
    ).toBe(false);
  });

  it("серое: чужое уже видели", () => {
    expect(
      labTaskChatHasUnread({
        viewerUserId: "марк",
        seenAt: "2026-08-28T18:00:00.000Z",
        comments: [
          { authorUserId: "сева", createdAt: "2026-08-28T17:05:00.000Z" },
        ],
      }),
    ).toBe(false);
  });
});

describe("labTaskChatPreviewText", () => {
  it("обрезает длинный текст с кириллицей вокруг", () => {
    const out = labTaskChatPreviewText("Счёт по Сынгаевской А. ".repeat(8), 40);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out).toContain("Сынгаевской");
  });
});
