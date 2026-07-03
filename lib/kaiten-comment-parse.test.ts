import { describe, expect, it } from "vitest";
import {
  firstOrderChatTriggerLine,
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
