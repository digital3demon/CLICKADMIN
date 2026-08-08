import { describe, expect, it } from "vitest";
import {
  formatTelegramHtmlLinkList,
  TELEGRAM_LIST_ITEM_SEPARATOR,
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

  it("разделитель и статус между записями", () => {
    const out = formatTelegramHtmlLinkList(
      [
        {
          url: "https://example.com/a",
          label: "2607-349",
          detail: "Статус: Производство",
        },
        {
          url: "https://example.com/b",
          label: "2607-359",
          detail: "Статус: Сборка",
        },
      ],
      "Пусто",
      "Актуальная запись",
    );
    expect(out).toContain(TELEGRAM_LIST_ITEM_SEPARATOR);
    expect(out).toContain("Статус: Производство");
    expect(out).toContain("Статус: Сборка");
    expect(out.indexOf("2607-349")).toBeLessThan(
      out.indexOf(TELEGRAM_LIST_ITEM_SEPARATOR),
    );
  });

  it("укладывается в лимит Telegram", () => {
    const items = Array.from({ length: 200 }, (_, i) => ({
      url: `https://example.com/o/${i}`,
      label: `Наряд ${i} пациент длинное имя врача клиника`,
      detail: `Статус: Колонка ${i}`,
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
