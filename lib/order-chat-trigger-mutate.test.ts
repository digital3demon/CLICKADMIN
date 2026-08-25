import { describe, expect, it, vi } from "vitest";
import {
  applyKanbanChatTriggerSideEffects,
  chatTriggerKindFromText,
  persistKanbanButtonTriggers,
} from "./order-chat-trigger-mutate";

describe("chatTriggerKindFromText", () => {
  it("видит !!! и ??? с кириллицей вокруг", () => {
    expect(chatTriggerKindFromText("!!! Нужен срок от 10.02.2026")).toBe(
      "correction",
    );
    expect(chatTriggerKindFromText("??? коронка на 16")).toBe("prosthetics");
    expect(chatTriggerKindFromText("просто комментарий")).toBeNull();
  });
});

describe("persistKanbanButtonTriggers", () => {
  it("кнопка !!! пишет legacy и inbox", async () => {
    const create = vi.fn().mockResolvedValue({});
    const upsert = vi.fn().mockResolvedValue({});
    const db = {
      orderChatCorrection: {
        findFirst: vi.fn().mockResolvedValue(null),
        create,
      },
      orderChatInboxItem: { upsert },
      user: { findMany: vi.fn().mockResolvedValue([]) },
    };
    await persistKanbanButtonTriggers({
      db: db as never,
      tenantId: "t1",
      orderId: "o1",
      action: "correction",
      messageText: "!!! срок от 10.02.2026",
      commentId: "cm-1",
      authorLabel: "Менеджер",
      syncState: "LOCAL_ONLY",
    });
    expect(create).toHaveBeenCalled();
    expect(upsert).toHaveBeenCalled();
  });
});

describe("applyKanbanChatTriggerSideEffects", () => {
  it("удаляет pending корректировку вместе с inbox", async () => {
    const deleteManyCorr = vi.fn().mockResolvedValue({ count: 1 });
    const deleteManyInbox = vi.fn().mockResolvedValue({ count: 1 });
    const db = {
      orderChatCorrection: {
        findMany: vi.fn().mockResolvedValue([{ id: "c1" }]),
        deleteMany: deleteManyCorr,
      },
      orderProstheticsRequest: { findMany: vi.fn(), deleteMany: vi.fn() },
      orderChatInboxItem: { deleteMany: deleteManyInbox, updateMany: vi.fn() },
    };
    await applyKanbanChatTriggerSideEffects({
      db: db as never,
      tenantId: "t1",
      orderId: "o1",
      commentId: "cm-1",
      oldText: "!!! старый срок",
      newText: null,
    });
    expect(deleteManyCorr).toHaveBeenCalledWith({
      where: { id: { in: ["c1"] } },
    });
    expect(deleteManyInbox).toHaveBeenCalled();
  });

  it("правит текст pending корректировки", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = {
      orderChatCorrection: {
        findMany: vi.fn().mockResolvedValue([{ id: "c1" }]),
        updateMany,
        deleteMany: vi.fn(),
      },
      orderProstheticsRequest: { findMany: vi.fn(), deleteMany: vi.fn() },
      orderChatInboxItem: {
        deleteMany: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        upsert: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      user: { findMany: vi.fn().mockResolvedValue([]) },
    };
    await applyKanbanChatTriggerSideEffects({
      db: db as never,
      tenantId: "t1",
      orderId: "o1",
      commentId: "cm-1",
      oldText: "!!! старый срок",
      newText: "!!! новый срок от 10.02.2026",
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["c1"] } },
      data: { text: "новый срок от 10.02.2026" },
    });
  });
});
