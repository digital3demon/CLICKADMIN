import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/order-chat-inbox-dual-read.server", () => ({
  isOrderChatInboxReadNewEnabledForTenant: () => true,
}));

import { fetchMergedOrderChatCorrections } from "./order-chat-corrections-read";

describe("fetchMergedOrderChatCorrections", () => {
  it("merges inbox and legacy without duplicate kaitenCommentId", async () => {
    const legacyAt = new Date("2026-07-01T10:00:00Z");
    const inboxAt = new Date("2026-07-01T10:00:01Z");

    const db = {
      orderChatCorrection: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "legacy-1",
            text: "тотальная мод-ка 70к",
            source: "KAITEN",
            authorLabel: "Админ",
            createdAt: legacyAt,
            resolvedAt: null,
            rejectedAt: null,
            kaitenCommentId: 42,
          },
          {
            id: "legacy-only",
            text: "старая без kaiten id",
            source: "KAITEN",
            authorLabel: null,
            createdAt: new Date("2026-06-01T10:00:00Z"),
            resolvedAt: null,
            rejectedAt: null,
            kaitenCommentId: null,
          },
        ]),
      },
      orderChatInboxItem: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "inbox-1",
            text: "!!! тотальная мод-ка 70к",
            source: "KAITEN",
            authorLabel: "Админ",
            createdAt: inboxAt,
            resolvedAt: null,
            rejectedAt: null,
            kaitenCommentId: 42,
          },
        ]),
      },
    };

    const rows = await fetchMergedOrderChatCorrections(db as never, "order-1");

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.id)).toEqual(["legacy-only", "inbox-1"]);
    expect(rows[1]?.text).toBe("тотальная мод-ка 70к");
  });
});
