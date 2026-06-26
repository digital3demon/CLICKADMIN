import { describe, expect, it } from "vitest";
import {
  htmlReplyBodyToPlainText,
  mergeReplyHtmlWithImages,
  plainTextToReplyHtml,
} from "./reply-body-plain-text";

describe("htmlReplyBodyToPlainText", () => {
  it("убирает теги абзацев", () => {
    expect(
      htmlReplyBodyToPlainText(
        "<p>Здравствуйте!</p><p>Ваш наряд 2606-395 принят в работу.</p>",
      ),
    ).toBe("Здравствуйте!\n\nВаш наряд 2606-395 принят в работу.");
  });
});

describe("plainTextToReplyHtml", () => {
  it("собирает абзацы из пустых строк", () => {
    expect(plainTextToReplyHtml("Строка 1\n\nСтрока 2")).toBe(
      "<p>Строка 1</p><p>Строка 2</p>",
    );
  });
});

describe("mergeReplyHtmlWithImages", () => {
  it("оставляет img перед текстом", () => {
    const out = mergeReplyHtmlWithImages(
      ['<img src="cid:a@crm" alt="logo">'],
      "<p>Текст</p>",
    );
    expect(out).toContain('<img src="cid:a@crm"');
    expect(out).toContain("<p>Текст</p>");
  });
});
