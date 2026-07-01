import { describe, expect, it } from "vitest";
import {
  formatOrderChatSourceCaption,
  orderChatToastTitle,
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

describe("orderChatToastTitle", () => {
  it("добавляет автора в заголовок тоста", () => {
    expect(orderChatToastTitle("correction", "Всеволод Соколов")).toBe(
      "Корректировка от Всеволод Соколов",
    );
    expect(orderChatToastTitle("prosthetics", "Марк")).toBe(
      "Заказ протетики от Марк",
    );
  });

  it("без автора — короткий заголовок", () => {
    expect(orderChatToastTitle("correction", null)).toBe("Корректировка");
    expect(orderChatToastTitle("prosthetics", "")).toBe("Протетика");
  });
});

describe("trimOrderChatAuthorLabel", () => {
  it("обрезает длинные имена", () => {
    const long = "а".repeat(200);
    expect(trimOrderChatAuthorLabel(long)?.length).toBe(120);
  });
});
