import { describe, expect, it } from "vitest";
import {
  applyOptimisticKaitenBlocksToLinkedRows,
  forgetOptimisticKaitenBlock,
  rememberOptimisticKaitenBlock,
} from "@/lib/kanban/optimistic-kaiten-block";

function row(id: string, blocked: boolean, reason: string | null) {
  return {
    id,
    kaitenBlocked: blocked,
    kaitenBlockReason: reason,
    kaitenBlockedAt: blocked ? "2026-08-17T17:00:00.000Z" : null,
  };
}

describe("optimistic kaiten block overlay", () => {
  it("keeps local block while DB still unblocked (кириллица в причине)", () => {
    rememberOptimisticKaitenBlock("ord-1", {
      blocked: true,
      blockReason: "Не те данные от Анискиной",
      blockedAt: "2026-08-17T17:02:00.000Z",
    });
    const out = applyOptimisticKaitenBlocksToLinkedRows([
      row("ord-1", false, null),
      row("ord-2", false, null),
    ]);
    expect(out[0]?.kaitenBlocked).toBe(true);
    expect(out[0]?.kaitenBlockReason).toBe("Не те данные от Анискиной");
    expect(out[1]?.kaitenBlocked).toBe(false);
    forgetOptimisticKaitenBlock("ord-1");
  });

  it("drops overlay when server already has the new reason", () => {
    rememberOptimisticKaitenBlock("ord-1", {
      blocked: true,
      blockReason: "новая причина",
    });
    const out = applyOptimisticKaitenBlocksToLinkedRows([
      row("ord-1", true, "новая причина"),
    ]);
    expect(out[0]?.kaitenBlockReason).toBe("новая причина");
    const again = applyOptimisticKaitenBlocksToLinkedRows([
      row("ord-1", true, "старая"),
    ]);
    expect(again[0]?.kaitenBlockReason).toBe("старая");
  });
});
