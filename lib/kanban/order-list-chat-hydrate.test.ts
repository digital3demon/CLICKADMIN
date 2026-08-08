import { describe, expect, it } from "vitest";
import { needsOrderListKaitenChatFallback } from "@/lib/kanban/order-list-chat-hydrate";

describe("needsOrderListKaitenChatFallback", () => {
  it("true when mirror returned ok but no comments yet", () => {
    expect(
      needsOrderListKaitenChatFallback({ mirrorOk: true, commentCount: 0 }),
    ).toBe(true);
  });

  it("false when mirror already has comments", () => {
    expect(
      needsOrderListKaitenChatFallback({ mirrorOk: true, commentCount: 2 }),
    ).toBe(false);
  });

  it("false when mirror request failed", () => {
    expect(
      needsOrderListKaitenChatFallback({ mirrorOk: false, commentCount: 0 }),
    ).toBe(false);
  });
});
