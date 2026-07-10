import { describe, expect, it } from "vitest";
import {
  formatOrderChatSourceCaption,
  formatOrderChatSourceDateTime,
  orderChatToastTitle,
  trimOrderChatAuthorLabel,
} from "./order-chat-trigger-author";

describe("formatOrderChatSourceCaption", () => {
  const createdAt = "2026-07-10T12:30:00.000Z";

  it("добавляет источник, автора и дату", () => {
    expect(
      formatOrderChatSourceCaption("KAITEN", "Roman", createdAt),
    ).toMatch(/^Kaiten — Roman — /);
    expect(
      formatOrderChatSourceCaption("KAITEN", "Roman", createdAt),
    ).toContain("2026");
  });

  it("без автора — источник и дата", () => {
    expect(formatOrderChatSourceCaption("KAITEN", null, createdAt)).toMatch(
      /^Kaiten — /,
    );
    expect(formatOrderChatSourceCaption("DEMO_KANBAN", "  ", createdAt)).toMatch(
      /^Канбан — /,
    );
  });

  it("без даты — только источник и автор", () => {
    expect(
      formatOrderChatSourceCaption("KAITEN", "Всеволод Соколов"),
    ).toBe("Kaiten — Всеволод Соколов");
    expect(formatOrderChatSourceCaption("KAITEN", null)).toBe("Kaiten");
  });
});

describe("formatOrderChatSourceDateTime", () => {
  it("форматирует ISO в ru-RU", () => {
    const out = formatOrderChatSourceDateTime("2026-07-10T12:30:00.000Z");
    expect(out).toContain("2026");
    expect(out).toMatch(/\d{2}:\d{2}/);
  });

  it("пустая строка для невалидной даты", () => {
    expect(formatOrderChatSourceDateTime("not-a-date")).toBe("");
    expect(formatOrderChatSourceDateTime(null)).toBe("");
  });
});

describe("orderChatToastTitle", () => {
  const createdAt = "2026-07-10T12:30:00.000Z";

  it("тип, автор и дата через тире", () => {
    expect(
      orderChatToastTitle("correction", "Всеволод Соколов", createdAt),
    ).toMatch(/^Корректировка — Всеволод Соколов — /);
    expect(orderChatToastTitle("prosthetics", "Марк", createdAt)).toMatch(
      /^Заказ протетики — Марк — /,
    );
    expect(orderChatToastTitle("chat", "Roman", createdAt)).toMatch(
      /^Чат — Roman — /,
    );
    expect(orderChatToastTitle("personal", "Арина", createdAt)).toMatch(
      /^Для вас — Арина — /,
    );
  });

  it("без автора — тип и дата", () => {
    expect(orderChatToastTitle("correction", null, createdAt)).toMatch(
      /^Корректировка — /,
    );
    expect(orderChatToastTitle("prosthetics", "", createdAt)).toMatch(
      /^Заказ протетики — /,
    );
  });

  it("без даты — тип и автор", () => {
    expect(orderChatToastTitle("correction", "Всеволод Соколов")).toBe(
      "Корректировка — Всеволод Соколов",
    );
    expect(orderChatToastTitle("prosthetics", null)).toBe("Заказ протетики");
    expect(orderChatToastTitle("chat", null)).toBe("Чат");
  });
});

describe("trimOrderChatAuthorLabel", () => {
  it("обрезает длинные имена", () => {
    const long = "а".repeat(200);
    expect(trimOrderChatAuthorLabel(long)?.length).toBe(120);
  });
});
