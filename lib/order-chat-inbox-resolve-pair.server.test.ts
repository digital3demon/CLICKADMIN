import { describe, expect, it, vi } from "vitest";
import { closeOrderProstheticsRequestPair } from "./order-chat-inbox-resolve-pair.server";

describe("closeOrderProstheticsRequestPair", () => {
  it("закрывает inbox и legacy с одним текстом без kid (заказы ↔ финотдел)", async () => {
    const inboxUpdate = vi.fn().mockResolvedValue({});
    const legacyUpdate = vi.fn().mockResolvedValue({});
    const db = {
      orderChatInboxItem: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "inbox-1",
            text: "??? коронка на 16",
            createdAt: new Date("2026-07-01T10:00:00.100Z"),
          },
        ]),
        update: inboxUpdate,
      },
      orderProstheticsRequest: {
        findFirst: vi.fn().mockResolvedValue({
          id: "leg-1",
          text: "коронка на 16",
          resolvedAt: null,
          rejectedAt: null,
          kaitenCommentId: null,
          createdAt: new Date("2026-07-01T10:00:00.000Z"),
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "leg-1",
            text: "коронка на 16",
            createdAt: new Date("2026-07-01T10:00:00.000Z"),
          },
        ]),
        update: legacyUpdate,
      },
    };

    const closed = await closeOrderProstheticsRequestPair(
      db as never,
      "o1",
      "leg-1",
      "accept",
      "u1",
    );
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    expect(closed.inboxIds).toContain("inbox-1");
    expect(closed.legacyIds).toContain("leg-1");
    expect(inboxUpdate).toHaveBeenCalled();
    expect(legacyUpdate).toHaveBeenCalled();
  });
});
