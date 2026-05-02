import { describe, expect, it } from "vitest";
import { escapeTelegramHtml, telegramHtmlLink } from "./telegram-html";

describe("escapeTelegramHtml", () => {
  it("экранирует &, <, >", () => {
    expect(escapeTelegramHtml("a & b < c > d")).toBe(
      "a &amp; b &lt; c &gt; d",
    );
  });

  it("кириллица без изменений", () => {
    expect(escapeTelegramHtml("Шапка «тест»")).toBe("Шапка «тест»");
  });
});

describe("telegramHtmlLink", () => {
  it("оборачивает URL и подпись", () => {
    expect(
      telegramHtmlLink(
        "https://crm.example/kanban?card=x&board=y",
        "2604-001 Иванов",
      ),
    ).toBe(
      '<a href="https://crm.example/kanban?card=x&amp;board=y">2604-001 Иванов</a>',
    );
  });
});
