import { describe, expect, it } from "vitest";
import {
  mergeSidebarRecentPaidDismissedKeys,
  sidebarRecentPaidDismissedKeySet,
  sidebarRecentPaidDismissEntryKey,
} from "@/lib/sidebar-recent-paid-dismissed";

describe("sidebarRecentPaidDismissed", () => {
  it("builds stable entry keys", () => {
    expect(sidebarRecentPaidDismissEntryKey("a", "2026-01-01T00:00:00.000Z")).toBe(
      "a\t2026-01-01T00:00:00.000Z",
    );
  });

  it("parses keys from JSON value", () => {
    const s = sidebarRecentPaidDismissedKeySet({
      v: 1,
      keys: ["x\t1", "y\t2", 3, "", null],
    });
    expect([...s].sort()).toEqual(["x\t1", "y\t2"]);
  });

  it("merges and caps length", () => {
    const prev = Array.from({ length: 400 }, (_, i) => `id\t${i}`);
    const merged = mergeSidebarRecentPaidDismissedKeys(prev, "last\tz");
    expect(merged.keys).toHaveLength(400);
    expect(merged.keys[399]).toBe("last\tz");
    expect(merged.keys[0]).toBe("id\t1");
  });
});
