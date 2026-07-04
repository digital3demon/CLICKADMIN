import { describe, expect, it } from "vitest";
import {
  buildKaitenCommentTextWithCrmAuthor,
  firstOrderChatTriggerLine,
  parseKaitenListComment,
  stripOrderChatTriggerPrefixKeepFullMessage,
  textIncludesAdminLabMention,
  textIncludesClicklabMention,
} from "@/lib/kaiten-comment-parse";

describe("textIncludesAdminLabMention", () => {
  it("находит кастомный тег после нормализации HTML и кириллицы рядом", () => {
    expect(textIncludesAdminLabMention("Напомни @my_lab завтра", "my_lab")).toBe(true);
    expect(textIncludesAdminLabMention("без тега", "my_lab")).toBe(false);
  });

  it("совместимо с прежним @clicklab по умолчанию", () => {
    expect(textIncludesClicklabMention("письмо @clicklab про мост")).toBe(true);
    expect(textIncludesAdminLabMention("письмо @clicklab про мост", "clicklab")).toBe(
      true,
    );
  });

  it("@ClickLab тест — чат, не корректировка и не протетика", () => {
    const text = "@ClickLab тест";
    expect(textIncludesAdminLabMention(text, "clicklab")).toBe(true);
    expect(firstOrderChatTriggerLine(text, "!!!")).toBeNull();
    expect(firstOrderChatTriggerLine(text, "???")).toBeNull();
  });
});

describe("order chat trigger prefixes", () => {
  it("!!! и ??? классифицируются отдельно от @ClickLab", () => {
    expect(firstOrderChatTriggerLine("!!! переделать коронку", "!!!")).toBe(
      "!!! переделать коронку",
    );
    expect(
      stripOrderChatTriggerPrefixKeepFullMessage("!!! переделать коронку", "!!!"),
    ).toBe("переделать коронку");

    expect(firstOrderChatTriggerLine("??? нужен мост", "???")).toBe("??? нужен мост");
    expect(stripOrderChatTriggerPrefixKeepFullMessage("??? нужен мост", "???")).toBe(
      "нужен мост",
    );

    expect(textIncludesAdminLabMention("??? нужен мост", "clicklab")).toBe(false);
  });
});

describe("CRM draft marker in Kaiten comments", () => {
  it("встраивает и извлекает crmDraftId из служебной строки", () => {
    const raw = buildKaitenCommentTextWithCrmAuthor(
      "Иван Иванов",
      "!!! проверка @ClickLab",
      "cm_ABC12345",
    );
    const parsed = parseKaitenListComment({ id: 10, text: raw, created: "2026-07-04T00:00:00.000Z" });
    expect(parsed).not.toBeNull();
    expect(parsed?.isCrm).toBe(true);
    expect(parsed?.authorName).toBe("Иван Иванов");
    expect(parsed?.crmDraftId).toBe("cm_ABC12345");
    expect(parsed?.text).toBe("!!! проверка @ClickLab");
  });

  it("игнорирует невалидный draft id и не ломает парсинг кириллицы", () => {
    const parsed = parseKaitenListComment({
      id: 11,
      text: "[CRM · Петров][DRAFT:плохо]\n@ClickLab тест кириллица",
      created: "2026-07-04T00:00:00.000Z",
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.isCrm).toBe(true);
    expect(parsed?.crmDraftId ?? null).toBeNull();
    expect(textIncludesAdminLabMention(parsed?.text || "", "clicklab")).toBe(true);
  });
});
