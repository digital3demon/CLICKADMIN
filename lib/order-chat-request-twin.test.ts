import { describe, expect, it } from "vitest";
import { areChatRequestCreatedTwins } from "./order-chat-request-twin";

describe("areChatRequestCreatedTwins", () => {
  it("одно сообщение: разница меньше 2 с", () => {
    expect(
      areChatRequestCreatedTwins(
        new Date("2026-07-01T10:00:00.000Z"),
        new Date("2026-07-01T10:00:00.400Z"),
      ),
    ).toBe(true);
  });

  it("тот же текст спустя несколько секунд — не близнец", () => {
    expect(
      areChatRequestCreatedTwins(
        new Date("2026-07-01T10:00:00.000Z"),
        new Date("2026-07-01T10:00:05.000Z"),
      ),
    ).toBe(false);
  });
});
