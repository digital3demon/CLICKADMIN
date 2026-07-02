import { describe, expect, it } from "vitest";
import {
  kaitenChatLowPriorityColumnTitles,
  kaitenChatPriorityColumnTitles,
  shouldIncludeLowPriorityChatSyncCycle,
} from "@/lib/kaiten-chat-priority";

describe("kaiten-chat-priority", () => {
  it("has default priority columns", () => {
    expect(kaitenChatPriorityColumnTitles().length).toBeGreaterThan(0);
    expect(kaitenChatLowPriorityColumnTitles()).toContain("Сдана админам");
  });

  it("includes low priority every 4th cycle by default", () => {
    expect(shouldIncludeLowPriorityChatSyncCycle(0)).toBe(true);
    expect(shouldIncludeLowPriorityChatSyncCycle(1)).toBe(false);
    expect(shouldIncludeLowPriorityChatSyncCycle(4)).toBe(true);
  });
});
