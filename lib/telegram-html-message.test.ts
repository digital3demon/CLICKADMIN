import { describe, expect, it } from "vitest";
import {
  formatTelegramBotWebAppList,
  formatTelegramHtmlLinkList,
  formatTelegramListButtonText,
  telegramListTitleSurnamesOnly,
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

  it("только заголовок + кнопки с названием и статусом", () => {
    const out = formatTelegramBotWebAppList(
      [
        {
          url: "https://example.com/a",
          webAppUrl: "https://click-lab.online/tg-app?startapp=o_or_a",
          label: "2607-349 Марченко А.В. Зубарев С.В. Композит",
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
      "Актуальная запись (актуальное 08.08.2026–11.08.2026)",
    );
    expect(out.text).toBe(
      "<b>Актуальная запись (актуальное 08.08.2026–11.08.2026)</b>",
    );
    expect(out.text).not.toContain("Статус: Производство");
    expect(out.text).not.toContain("2607-349");
    expect(out.replyMarkup?.inline_keyboard).toHaveLength(2);
    const btn = out.replyMarkup?.inline_keyboard[0]?.[0];
    expect(btn).toMatchObject({
      web_app: { url: "https://click-lab.online/tg-app?startapp=o_or_a" },
    });
    expect(btn?.text).toContain("\n");
    expect(btn?.text).toContain("→ Производство");
    expect(btn?.text).not.toMatch(/^\d+\./);
    expect(btn!.text.length).toBeLessThanOrEqual(64);
  });

  it("без webAppUrl — url-кнопка", () => {
    const out = formatTelegramBotWebAppList(
      [{ url: "https://example.com/o/1", label: "Наряд 1", detail: "Статус: Сборка" }],
      "Пусто",
      "H",
    );
    expect(out.replyMarkup?.inline_keyboard[0]?.[0]).toEqual({
      text: "Наряд 1\n→ Сборка",
      url: "https://example.com/o/1",
    });
  });

  it("обрезает число кнопок и пишет «ещё»", () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      url: `https://example.com/o/${i}`,
      webAppUrl: `https://example.com/tg-app?startapp=o_${i}`,
      label: `Наряд ${i}`,
      detail: `Статус: Колонка ${i}`,
    }));
    const out = formatTelegramBotWebAppList(items, "Пусто", "Отгрузки");
    expect(out.text).toContain("<b>Отгрузки</b>");
    expect(out.text).toMatch(/… ещё \d+/);
    expect(out.replyMarkup!.inline_keyboard.length).toBe(40);
  });
});

describe("formatTelegramListButtonText", () => {
  it("фамилии без инициалов и статус со стрелкой", () => {
    const t = formatTelegramListButtonText(
      "2608-037 Марченко А.В. Зубарев С.В. Композит.кор 10.08 09:00",
      "Статус: Сдана админам",
    );
    expect(t).toContain("\n");
    expect(t).toContain("Марченко");
    expect(t).toContain("Зубарев");
    expect(t).not.toMatch(/А\.В\./);
    expect(t).not.toMatch(/С\.В\./);
    expect(t.split("\n")[1]).toBe("→ Сдана админам");
    expect(t.length).toBeLessThanOrEqual(64);
  });

  it("telegramListTitleSurnamesOnly режет инициалы и нумерацию", () => {
    expect(
      telegramListTitleSurnamesOnly(
        "1. 2608-062 Дроздова А.Ю. Лойберг Э.И. позиционер",
      ),
    ).toBe("2608-062 Дроздова Лойберг позиционер");
  });
});

describe("formatTelegramHtmlLinkList (совместимость)", () => {
  it("возвращает только заголовок", () => {
    const out = formatTelegramHtmlLinkList(
      [
        {
          url: "https://example.com/a",
          webAppUrl: "https://example.com/tg-app?x=1",
          label: "2607-349",
          detail: "Статус: Производство",
        },
      ],
      "Пусто",
      "H",
    );
    expect(out).toBe("<b>H</b>");
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
