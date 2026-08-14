import { describe, expect, it } from "vitest";
import { findMentionDraft } from "@/components/mail/MailAddToOrderDialog";

describe("findMentionDraft", () => {
  it("ловит @ после кириллицы с пробелом", () => {
    const text = "Всеволод @ро";
    expect(findMentionDraft(text, text.length)).toEqual({
      start: 9,
      end: text.length,
      query: "ро",
    });
  });

  it("не считает упоминанием склеенный токен до @", () => {
    expect(findMentionDraft("Всеволод@ро", 11)).toBeNull();
  });

  it("пустой ввод — нет черновика", () => {
    expect(findMentionDraft("", 0)).toBeNull();
    expect(findMentionDraft("нет тега", 4)).toBeNull();
  });
});
