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

  it("находит тег при смешении кириллицы и латиницы (например С кириллическая, a латинская)", () => {
    // В слове СlickLab первая буква С - кириллическая
    expect(textIncludesAdminLabMention("проверка @СlickLab", "clicklab")).toBe(true);
    // В слове лaбa первая a - латинская, вторая а - кириллическая
    expect(textIncludesAdminLabMention("проверка @лaбa", "лаба")).toBe(true);
    // В слове clicklаb буква а - кириллическая
    expect(textIncludesAdminLabMention("проверка @clicklаb", "clicklab")).toBe(true);
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

  it("извлекает DRAFT, если Kaiten разорвал маркеры на две строки", () => {
    const parsed = parseKaitenListComment({
      id: 12,
      text: "[CRM · Всеволод С]\n[DRAFT:cm-1785443244178-9kio3n]\n@digitaldemon ntnc tg",
      created: "2026-07-30T20:28:00.000Z",
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.isCrm).toBe(true);
    expect(parsed?.authorName).toBe("Всеволод С");
    expect(parsed?.crmDraftId).toBe("cm-1785443244178-9kio3n");
    expect(parsed?.text).toBe("@digitaldemon ntnc tg");
  });
});
