import { describe, expect, it } from "vitest";
import { telegramSupergroupMessagePublicUrl } from "./telegram-supergroup-message-link";

describe("telegramSupergroupMessagePublicUrl", () => {
  it("builds /c/ link for supergroup id", () => {
    const url = telegramSupergroupMessagePublicUrl("-1001234567890", 42);
    expect(url).toBe("https://t.me/c/1234567890/42");
  });

  it("returns null for invalid id", () => {
    expect(telegramSupergroupMessagePublicUrl("abc", 1)).toBeNull();
  });
});
