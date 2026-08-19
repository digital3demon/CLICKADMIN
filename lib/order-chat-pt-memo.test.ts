import { describe, expect, it } from "vitest";
import {
  formatOrderChatPtMemoMessage,
  isOrderChatPtMemoTrigger,
  stripOrderChatPtMemoPrefix,
  techMemoTextFromPtChatBody,
} from "@/lib/order-chat-pt-memo";

describe("order-chat-pt-memo", () => {
  it("пусто — не триггер", () => {
    expect(isOrderChatPtMemoTrigger("")).toBe(false);
    expect(isOrderChatPtMemoTrigger("  ")).toBe(false);
    expect(stripOrderChatPtMemoPrefix("просто текст")).toBeNull();
  });

  it("кириллица до и после «ПТ:»", () => {
    expect(
      stripOrderChatPtMemoPrefix("шапка наряда\nПТ: коронка 21\nхвост после"),
    ).toBe("шапка наряда\nкоронка 21\nхвост после");
  });

  it("форматирует сообщение и режет пометку до лимита колонки", () => {
    expect(formatOrderChatPtMemoMessage("модель на согласе")).toBe(
      "ПТ: модель на согласе",
    );
    const long = "я".repeat(120);
    const memo = techMemoTextFromPtChatBody(`ПТ: ${long}`);
    expect(memo).toHaveLength(100);
    expect(memo?.startsWith("я")).toBe(true);
  });
});
