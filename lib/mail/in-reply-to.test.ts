import { describe, expect, it } from "vitest";
import {
  extractDocumentThreadParentMessageIds,
  extractInReplyToMessageIds,
  extractReplyParentMessageIds,
  mailMessageIdLookupVariants,
  normalizeMailMessageId,
} from "@/lib/mail/in-reply-to";

describe("in-reply-to", () => {
  it("нормализует id и читает кириллические заголовки вокруг In-Reply-To", () => {
    expect(normalizeMailMessageId("abc@host")).toBe("<abc@host>");
    expect(
      extractReplyParentMessageIds({
        "In-Reply-To": "<doc-1@lab.ru>",
        Subject: "Ответ по счёту клиника",
      }),
    ).toEqual(["<doc-1@lab.ru>"]);
  });

  it("для автопривязки берёт In-Reply-To, а не всю цепочку References", () => {
    const headers = {
      "In-Reply-To": "<auto-reply@lab.ru>",
      References: "<order-src@clinic.ru> <auto-reply@lab.ru>",
      Subject: "Re: Благодарим за заказ! Ваш заказ 2608-171",
    };
    expect(extractInReplyToMessageIds(headers)).toEqual(["<auto-reply@lab.ru>"]);
    expect(extractDocumentThreadParentMessageIds(headers)).toEqual([
      "<auto-reply@lab.ru>",
    ]);
    expect(extractReplyParentMessageIds(headers)).toEqual([
      "<auto-reply@lab.ru>",
      "<order-src@clinic.ru>",
    ]);
  });

  it("без In-Reply-To — только последний References", () => {
    expect(
      extractDocumentThreadParentMessageIds({
        References: "<a@x> <b@x> <c@x>",
      }),
    ).toEqual(["<c@x>"]);
  });

  it("variants для поиска messageId", () => {
    expect(mailMessageIdLookupVariants(["<a@b>", "c@d"])).toEqual([
      "<a@b>",
      "a@b",
      "<c@d>",
      "c@d",
    ]);
  });
});
