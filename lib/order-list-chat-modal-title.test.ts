import { describe, expect, it } from "vitest";
import { formatOrderListChatModalTitle } from "./order-list-chat-modal-title";

describe("formatOrderListChatModalTitle", () => {
  it("номер, пациент и врач", () => {
    expect(
      formatOrderListChatModalTitle(
        "2607-093",
        "Соколов Николай Викторович",
        "Халдинова Виктория",
      ),
    ).toBe("Чат 2607-093 Соколов Н. В. Халдинова В.");
  });

  it("только номер, если нет имён", () => {
    expect(formatOrderListChatModalTitle("2607-093", null, null)).toBe(
      "Чат 2607-093",
    );
  });

  it("кириллица в номере и именах", () => {
    expect(
      formatOrderListChatModalTitle("2607-157", "Петрова Анна", "Иванов Иван"),
    ).toMatch(/^Чат 2607-157 Петрова А\. Иванов И\.$/);
  });
});
