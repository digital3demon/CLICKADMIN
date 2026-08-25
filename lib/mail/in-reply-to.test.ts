import { describe, expect, it } from "vitest";
import {
  extractReplyParentMessageIds,
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
});
