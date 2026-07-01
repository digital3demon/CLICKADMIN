import { describe, expect, it } from "vitest";
import {
  formatOrderChatSourceCaption,
  trimOrderChatAuthorLabel,
} from "./order-chat-trigger-author";

describe("formatOrderChatSourceCaption", () => {
  it("добавляет имя автора для Kaiten", () => {
    expect(
      formatOrderChatSourceCaption("KAITEN", "Всеволод Соколов"),
    ).toBe("Kaiten · Всеволод Соколов");
  });

  it("без автора — только источник", () => {
    expect(formatOrderChatSourceCaption("KAITEN", null)).toBe("Kaiten");
    expect(formatOrderChatSourceCaption("DEMO_KANBAN", "  ")).toBe("Канбан");
  });
});

describe("trimOrderChatAuthorLabel", () => {
  it("обрезает длинные имена", () => {
    const long = "а".repeat(200);
    expect(trimOrderChatAuthorLabel(long)?.length).toBe(120);
  });
});
