import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/order-chat-inbox-dual-read.server", () => ({
  isOrderChatInboxReadNewEnabledForTenant: () => true,
}));

import { fetchMergedOrderProstheticsRequests } from "./order-prosthetics-requests-read";

describe("fetchMergedOrderProstheticsRequests", () => {
  it("merges inbox and legacy without duplicate kaitenCommentId", async () => {
    const legacyAt = new Date("2026-07-01T10:00:00Z");
    const inboxAt = new Date("2026-07-01T10:00:01Z");

    const db = {
      orderProstheticsRequest: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "legacy-1",
            text: "нужна коронка на 16",
            source: "KAITEN",
            authorLabel: "Врач",
            createdAt: legacyAt,
            resolvedAt: null,
            rejectedAt: null,
            kaitenCommentId: 99,
          },
          {
            id: "legacy-only",
            text: "старая заявка",
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
            text: "??? нужна коронка на 16",
            source: "KAITEN",
            authorLabel: "Врач",
            createdAt: inboxAt,
            resolvedAt: null,
            rejectedAt: null,
            kaitenCommentId: 99,
          },
        ]),
      },
    };

    const rows = await fetchMergedOrderProstheticsRequests(db as never, "order-1");

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.id)).toEqual(["legacy-only", "inbox-1"]);
    expect(rows[1]?.text).toBe("нужна коронка на 16");
  });

  it("схлопывает pending DEMO+KAITEN с разным форматированием текста", async () => {
    const db = {
      orderProstheticsRequest: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "legacy-demo",
            text: "Артикул: 01124 -1шт Артикул: 01460 -1шт 3D-ACR -1шт",
            source: "DEMO_KANBAN",
            authorLabel: "Roman",
            createdAt: new Date("2026-08-13T08:17:00Z"),
            resolvedAt: null,
            rejectedAt: null,
            arrivedAt: null,
            kaitenCommentId: null,
          },
          {
            id: "legacy-kaiten",
            text: "Артикул: 01124 -1шт\nАртикул: 01460 -1шт\n3D-ACR -1шт",
            source: "KAITEN",
            authorLabel: "Roman",
            createdAt: new Date("2026-08-13T08:15:00Z"),
            resolvedAt: null,
            rejectedAt: null,
            arrivedAt: null,
            kaitenCommentId: 55,
          },
        ]),
      },
      orderChatInboxItem: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const rows = await fetchMergedOrderProstheticsRequests(db as never, "order-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("legacy-demo");
  });

  it("pending merge ignores legacy twin when inbox already resolved", async () => {
    const { orderIdsWithPendingMergedProsthetics } = await import(
      "./order-prosthetics-requests-read"
    );
    const db = {
      orderProstheticsRequest: {
        findMany: vi.fn().mockResolvedValue([
          {
            orderId: "o1",
            kaitenCommentId: 99,
            resolvedAt: null,
            rejectedAt: null,
          },
        ]),
      },
      orderChatInboxItem: {
        findMany: vi.fn().mockResolvedValue([
          {
            orderId: "o1",
            kaitenCommentId: 99,
            resolvedAt: new Date("2026-07-10T10:00:00Z"),
            rejectedAt: null,
          },
        ]),
      },
    };

    const pending = await orderIdsWithPendingMergedProsthetics(db as never, [
      "o1",
    ]);
    expect(pending.has("o1")).toBe(false);
  });
});
