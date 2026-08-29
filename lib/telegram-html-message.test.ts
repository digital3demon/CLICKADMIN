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

  it("Мой срок: заголовок кириллицей, URL в скобках и строка срока", () => {
    const out = formatTelegramHtmlLinkList(
      [
        {
          url: "https://click-lab.online/kanban?orderRef=or_Y210YTY5cm8zMDY1dm56MWlucW0wcWR2Zg",
          label: "2608-361 Сынгаевская А. Староверова К.В. Ортопедия для Севы 11.09 09:00",
          detail: "Статус: К исполнению\nСрок : 27.08.26",
          showUrl: true,
        },
      ],
      "Пусто",
      "Мой срок, по 2026-08-31 включительно (2026-08-28…2026-08-31, МСК)",
    );
    expect(out).toContain("Сынгаевская А.");
    expect(out).toContain(
      "(<a href=\"https://click-lab.online/kanban?orderRef=or_Y210YTY5cm8zMDY1dm56MWlucW0wcWR2Zg\">https://click-lab.online/kanban?orderRef=or_Y210YTY5cm8zMDY1dm56MWlucW0wcWR2Zg</a>)",
    );
    expect(out).toContain("Статус: К исполнению");
    expect(out).toContain("Срок : 27.08.26");
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
