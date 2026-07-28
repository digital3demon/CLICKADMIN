import { describe, expect, it } from "vitest";
import {
  formatTelegramHtmlLinkList,
  truncateTelegramHtmlMessage,
} from "@/lib/telegram-html-message";

describe("formatTelegramHtmlLinkList", () => {
  it("пустой список — заголовок и текст", () => {
    const out = formatTelegramHtmlLinkList([], "Пусто", "Заголовок");
    expect(out).toContain("<b>Заголовок</b>");
    expect(out).toContain("Пусто");
  });

  it("пропускает url без http(s)", () => {
    const out = formatTelegramHtmlLinkList(
      [{ url: "/kanban?x=1", label: "bad" }],
      "Пусто",
      "H",
    );
    expect(out).not.toContain("<a href");
    expect(out).toContain("Пусто");
  });

  it("укладывается в лимит Telegram", () => {
    const items = Array.from({ length: 200 }, (_, i) => ({
      url: `https://example.com/o/${i}`,
      label: `Наряд ${i} пациент длинное имя врача клиника`,
    }));
    const out = formatTelegramHtmlLinkList(items, "Пусто", "Отгрузки");
    expect(out.length).toBeLessThanOrEqual(4096);
    expect(out).toMatch(/… ещё \d+/);
  });
});

describe("truncateTelegramHtmlMessage", () => {
  it("не обрывает на середине тега ссылки", () => {
    const line = `<a href="https://x.ru/1">one</a>\n`.repeat(500);
    const header = "<b>H</b>\n";
    const out = truncateTelegramHtmlMessage(header + line, 500);
    expect(out).not.toMatch(/<a href="[^"]*$/);
  });
});
