import { describe, expect, it, vi } from "vitest";
import {
  createOrderChatCorrectionIfNeeded,
  orderChatCorrectionTwinTexts,
} from "./order-chat-correction-db";

describe("orderChatCorrectionTwinTexts", () => {
  it("держит кириллицу до и после «!!!»", () => {
    const variants = orderChatCorrectionTwinTexts(
      "до !!! цвет с вестибулярной стороны 14 после",
    );
    expect(variants.some((v) => v.includes("цвет с вестибулярной стороны 14"))).toBe(
      true,
    );
  });
});

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

  it("привязывает kid к закрытой корректировке, а не создаёт новую заявку", async () => {
    const update = vi.fn().mockResolvedValue({});
    const create = vi.fn();
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "closed-1" });

    const db = {
      orderChatCorrection: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst,
        update,
        create,
        deleteMany: vi.fn(),
      },
    };

    await createOrderChatCorrectionIfNeeded(
      db as never,
      "order-1",
      "!!! цвет с вестибулярной стороны 14",
      "KAITEN",
      { kaitenCommentId: 501, authorLabel: "Роман" },
    );

    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: "closed-1" },
      data: {
        kaitenCommentId: 501,
        source: "KAITEN",
        authorLabel: "Роман",
      },
    });
  });

  it("складывает призрак pending+kid в уже исполненную запись без kid", async () => {
    const update = vi.fn().mockResolvedValue({});
    const del = vi.fn().mockResolvedValue({});
    const db = {
      orderChatCorrection: {
        findUnique: vi.fn().mockResolvedValue({
          id: "ghost-1",
          resolvedAt: null,
          rejectedAt: null,
        }),
        findFirst: vi.fn().mockResolvedValue({ id: "closed-old" }),
        update,
        delete: del,
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    await createOrderChatCorrectionIfNeeded(
      db as never,
      "order-1",
      "!!! цвет с вестибулярной стороны 14",
      "KAITEN",
      { kaitenCommentId: 501, authorLabel: "Роман" },
    );

    expect(del).toHaveBeenCalledWith({ where: { id: "ghost-1" } });
    expect(update).toHaveBeenCalledWith({
      where: { id: "closed-old" },
      data: {
        kaitenCommentId: 501,
        source: "KAITEN",
        authorLabel: "Роман",
      },
    });
  });
});
