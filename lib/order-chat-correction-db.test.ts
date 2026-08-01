import { describe, expect, it, vi } from "vitest";
import { createOrderChatCorrectionIfNeeded } from "./order-chat-correction-db";

describe("createOrderChatCorrectionIfNeeded", () => {
  it("binds KAITEN kid onto pending DEMO_KANBAN twin with same text", async () => {
    const update = vi.fn().mockResolvedValue({});
    const create = vi.fn();
    const findUnique = vi.fn().mockResolvedValue(null);
    const findFirst = vi.fn().mockResolvedValue({ id: "crm-1" });
    const deleteMany = vi.fn();

    const db = {
      orderChatCorrection: {
        findUnique,
        findFirst,
        update,
        create,
        deleteMany,
      },
    };

    await createOrderChatCorrectionIfNeeded(
      db as never,
      "order-1",
      "!!! 13 ед и вариатор мой прайс",
      "KAITEN",
      { kaitenCommentId: 99, authorLabel: "Всеволод С" },
    );

    expect(findFirst).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: "crm-1" },
      data: {
        kaitenCommentId: 99,
        source: "KAITEN",
        authorLabel: "Всеволод С",
      },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates KAITEN row when no pending twin", async () => {
    const create = vi.fn().mockResolvedValue({});
    const db = {
      orderChatCorrection: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        create,
        deleteMany: vi.fn(),
      },
    };

    await createOrderChatCorrectionIfNeeded(
      db as never,
      "order-1",
      "!!! новый текст",
      "KAITEN",
      { kaitenCommentId: 7, authorLabel: null },
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        orderId: "order-1",
        source: "KAITEN",
        text: "новый текст",
        kaitenCommentId: 7,
        authorLabel: null,
      },
    });
  });

  it("removes orphan DEMO_KANBAN twins when kid row already exists", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({});
    const db = {
      orderChatCorrection: {
        findUnique: vi.fn().mockResolvedValue({ id: "kaiten-1" }),
        findFirst: vi.fn(),
        update,
        create: vi.fn(),
        deleteMany,
      },
    };

    await createOrderChatCorrectionIfNeeded(
      db as never,
      "order-1",
      "!!! 13 ед и вариатор мой прайс",
      "KAITEN",
      { kaitenCommentId: 99, authorLabel: "Всеволод С" },
    );

    expect(update).toHaveBeenCalled();
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        orderId: "order-1",
        text: "13 ед и вариатор мой прайс",
        kaitenCommentId: null,
        resolvedAt: null,
        rejectedAt: null,
        id: { not: "kaiten-1" },
      },
    });
  });
});
