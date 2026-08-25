import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/order-chat-inbox-dual-read.server", () => ({
  isOrderChatInboxReadNewEnabledForTenant: () => true,
}));

import {
  collapsePendingCorrectionTextTwins,
  fetchMergedOrderChatCorrections,
} from "./order-chat-corrections-read";

describe("collapsePendingCorrectionTextTwins", () => {
  it("keeps KAITEN over DEMO_KANBAN for same pending text", () => {
    const at = new Date("2026-08-01T16:24:00Z");
    const rows = collapsePendingCorrectionTextTwins([
      {
        id: "crm",
        text: "13 ед и вариатор мой прайс",
        source: "DEMO_KANBAN",
        authorLabel: "Всеволод С",
        createdAt: at,
        resolvedAt: null,
        rejectedAt: null,
      },
      {
        id: "kai",
        text: "13 ед и вариатор мой прайс",
        source: "KAITEN",
        authorLabel: "Всеволод С",
        createdAt: at,
        resolvedAt: null,
        rejectedAt: null,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("kai");
    expect(rows[0]?.source).toBe("KAITEN");
  });

  it("тот же текст спустя несколько секунд не схлопывает в одну заявку", () => {
    const rows = collapsePendingCorrectionTextTwins([
      {
        id: "first",
        text: "срок от 10.02.2026",
        source: "DEMO_KANBAN",
        authorLabel: "Роман",
        createdAt: new Date("2026-08-01T16:24:00Z"),
        resolvedAt: null,
        rejectedAt: null,
      },
      {
        id: "second",
        text: "срок от 10.02.2026",
        source: "DEMO_KANBAN",
        authorLabel: "Роман",
        createdAt: new Date("2026-08-01T16:24:08Z"),
        resolvedAt: null,
        rejectedAt: null,
      },
    ]);
    expect(rows).toHaveLength(2);
  });
});

describe("fetchMergedOrderChatCorrections", () => {
  it("collapses DEMO_KANBAN + KAITEN legacy twins with same text", async () => {
    const at = new Date("2026-08-01T16:24:00Z");
    const db = {
      orderChatCorrection: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "crm",
            text: "13 ед и вариатор мой прайс",
            source: "DEMO_KANBAN",
            authorLabel: "Всеволод С",
            createdAt: at,
            resolvedAt: null,
            rejectedAt: null,
            kaitenCommentId: null,
          },
          {
            id: "kai",
            text: "13 ед и вариатор мой прайс",
            source: "KAITEN",
            authorLabel: "Всеволод С",
            createdAt: at,
            resolvedAt: null,
            rejectedAt: null,
            kaitenCommentId: 55,
          },
        ]),
      },
      orderChatInboxItem: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const rows = await fetchMergedOrderChatCorrections(db as never, "order-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("kai");
  });

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

  it("pending merge ignores legacy twin when inbox already resolved", async () => {
    const { orderIdsWithPendingMergedCorrections } = await import(
      "./order-chat-corrections-read"
    );
    const db = {
      orderChatCorrection: {
        findMany: vi.fn().mockResolvedValue([
          {
            orderId: "o1",
            kaitenCommentId: 42,
            resolvedAt: null,
            rejectedAt: null,
          },
        ]),
      },
      orderChatInboxItem: {
        findMany: vi.fn().mockResolvedValue([
          {
            orderId: "o1",
            kaitenCommentId: 42,
            resolvedAt: new Date("2026-07-10T10:00:00Z"),
            rejectedAt: null,
          },
        ]),
      },
    };

    const pending = await orderIdsWithPendingMergedCorrections(db as never, [
      "o1",
    ]);
    expect(pending.has("o1")).toBe(false);
  });

  it("pending merge ignores inbox twin when legacy already resolved", async () => {
    const { orderIdsWithPendingMergedCorrections } = await import(
      "./order-chat-corrections-read"
    );
    const db = {
      orderChatCorrection: {
        findMany: vi.fn().mockResolvedValue([
          {
            orderId: "o1",
            kaitenCommentId: 42,
            resolvedAt: new Date("2026-07-10T10:00:00Z"),
            rejectedAt: null,
            text: "цвет 14",
            createdAt: new Date("2026-07-01T10:00:00Z"),
          },
        ]),
      },
      orderChatInboxItem: {
        findMany: vi.fn().mockResolvedValue([
          {
            orderId: "o1",
            kaitenCommentId: 42,
            resolvedAt: null,
            rejectedAt: null,
            text: "!!! цвет 14",
            createdAt: new Date("2026-07-01T10:00:00Z"),
          },
        ]),
      },
    };

    const pending = await orderIdsWithPendingMergedCorrections(db as never, [
      "o1",
    ]);
    expect(pending.has("o1")).toBe(false);
  });

  it("pending merge keeps order when inbox twin still open", async () => {
    const { orderIdsWithPendingMergedCorrections } = await import(
      "./order-chat-corrections-read"
    );
    const db = {
      orderChatCorrection: {
        findMany: vi.fn().mockResolvedValue([
          {
            orderId: "o1",
            kaitenCommentId: 42,
            resolvedAt: null,
            rejectedAt: null,
          },
        ]),
      },
      orderChatInboxItem: {
        findMany: vi.fn().mockResolvedValue([
          {
            orderId: "o1",
            kaitenCommentId: 42,
            resolvedAt: null,
            rejectedAt: null,
          },
        ]),
      },
    };

    const pending = await orderIdsWithPendingMergedCorrections(db as never, [
      "o1",
    ]);
    expect(pending.has("o1")).toBe(true);
  });
});

describe("countOrdersWithPendingMergedCorrections", () => {
  it("counts distinct orders after merge", async () => {
    const { countOrdersWithPendingMergedCorrections } = await import(
      "./order-chat-corrections-read"
    );
    const db = {
      orderChatCorrection: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([
            { orderId: "o1" },
            { orderId: "o2" },
          ])
          .mockResolvedValueOnce([
            {
              orderId: "o1",
              kaitenCommentId: null,
              resolvedAt: null,
              rejectedAt: null,
            },
            {
              orderId: "o1",
              kaitenCommentId: 1,
              resolvedAt: null,
              rejectedAt: null,
            },
            {
              orderId: "o2",
              kaitenCommentId: 2,
              resolvedAt: null,
              rejectedAt: null,
            },
          ]),
      },
      orderChatInboxItem: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const n = await countOrdersWithPendingMergedCorrections(
      db as never,
      "tenant-1",
    );
    expect(n).toBe(2);
  });
});
