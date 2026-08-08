import { describe, expect, it } from "vitest";
import {
  formatTelegramBotWebAppList,
  formatTelegramHtmlLinkList,
  TELEGRAM_LIST_ITEM_SEPARATOR,
  truncateTelegramButtonText,
  truncateTelegramHtmlMessage,
} from "@/lib/telegram-html-message";

describe("formatTelegramBotWebAppList", () => {
  it("пустой список — заголовок и текст", () => {
    const out = formatTelegramBotWebAppList([], "Пусто", "Заголовок");
    expect(out.text).toContain("<b>Заголовок</b>");
    expect(out.text).toContain("Пусто");
    expect(out.replyMarkup).toBeUndefined();
  });

  it("текст без ссылок + web_app кнопки", () => {
    const out = formatTelegramBotWebAppList(
      [
        {
          url: "https://example.com/a",
          webAppUrl: "https://click-lab.online/tg-app?startapp=o_or_a",
          label: "2607-349",
          detail: "Статус: Производство",
        },
        {
          url: "https://example.com/b",
          webAppUrl: "https://click-lab.online/tg-app?startapp=o_or_b",
          label: "2607-359",
          detail: "Статус: Сборка",
        },
      ],
      "Пусто",
      "Актуальная запись",
    );
    expect(out.text).toContain(TELEGRAM_LIST_ITEM_SEPARATOR);
    expect(out.text).toContain("Статус: Производство");
    expect(out.text).not.toContain("<a href");
    expect(out.replyMarkup?.inline_keyboard).toHaveLength(2);
    expect(out.replyMarkup?.inline_keyboard[0]?.[0]).toMatchObject({
      text: expect.stringContaining("2607-349"),
      web_app: { url: "https://click-lab.online/tg-app?startapp=o_or_a" },
    });
  });

  it("без webAppUrl — url-кнопка", () => {
    const out = formatTelegramBotWebAppList(
      [{ url: "https://example.com/o/1", label: "Наряд 1" }],
      "Пусто",
      "H",
    );
    expect(out.replyMarkup?.inline_keyboard[0]?.[0]).toEqual({
      text: "1. Наряд 1",
      url: "https://example.com/o/1",
    });
  });

  it("укладывается в лимит Telegram", () => {
    const items = Array.from({ length: 200 }, (_, i) => ({
      url: `https://example.com/o/${i}`,
      webAppUrl: `https://example.com/tg-app?startapp=o_${i}`,
      label: `Наряд ${i} пациент длинное имя врача клиника`,
      detail: `Статус: Колонка ${i}`,
    }));
    const out = formatTelegramBotWebAppList(items, "Пусто", "Отгрузки");
    expect(out.text.length).toBeLessThanOrEqual(4096);
    expect(out.text).toMatch(/… ещё \d+/);
    expect(out.replyMarkup!.inline_keyboard.length).toBeLessThanOrEqual(40);
  });
});

describe("formatTelegramHtmlLinkList (совместимость)", () => {
  it("возвращает только текст", () => {
    const out = formatTelegramHtmlLinkList(
      [
        {
          url: "https://example.com/a",
          webAppUrl: "https://example.com/tg-app?x=1",
          label: "2607-349",
          detail: "Статус: Производство",
        },
        {
          url: "https://example.com/b",
          webAppUrl: "https://example.com/tg-app?x=2",
          label: "2607-350",
          detail: "Статус: Сборка",
        },
      ],
      "Пусто",
      "H",
    );
    expect(out).toContain("2607-349");
    expect(out).toContain(TELEGRAM_LIST_ITEM_SEPARATOR);
  });
});

describe("truncateTelegramButtonText", () => {
  it("режет до 64", () => {
    const long = "x".repeat(80);
    expect(truncateTelegramButtonText(long).length).toBe(64);
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
