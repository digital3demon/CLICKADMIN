import { describe, expect, it } from "vitest";
import { filterOrderDocumentMailEmails } from "@/lib/mail/order-document-mail-filter";

describe("filterOrderDocumentMailEmails", () => {
  it("не берёт входящее письмо заказа без исходящих документов", () => {
    expect(
      filterOrderDocumentMailEmails([
        {
          id: "src",
          direction: "INBOUND",
          threadId: null,
        },
      ]),
    ).toEqual([]);
  });

  it("берёт исходящий счёт и входящий ответ в той же ветке вокруг кириллицы", () => {
    const sent = {
      id: "out",
      direction: "OUTBOUND" as const,
      threadId: "<doc-1@lab>",
      note: "Счёт клиника",
    };
    const reply = {
      id: "in",
      direction: "INBOUND" as const,
      threadId: "<doc-1@lab>",
      note: "Оплатим завтра",
    };
    const other = {
      id: "order",
      direction: "INBOUND" as const,
      threadId: null,
      note: "Доработать моделировку",
    };
    expect(
      filterOrderDocumentMailEmails([other, sent, reply]).map((e) => e.id),
    ).toEqual(["out", "in"]);
  });
});
