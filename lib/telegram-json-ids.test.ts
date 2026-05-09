import { describe, expect, it } from "vitest";
import { telegramPeerIdToString } from "./telegram-json-ids";

describe("telegramPeerIdToString", () => {
  it("preserves string ids", () => {
    expect(telegramPeerIdToString("-100123")).toBe("-100123");
  });

  it("stringifies numbers", () => {
    expect(telegramPeerIdToString(-1002116812857)).toBe("-1002116812857");
  });
});
