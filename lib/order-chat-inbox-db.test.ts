import { describe, expect, it, vi } from "vitest";
import {
  bindOrderChatInboxItemsByCrmDraft,
  createOrderChatInboxItemsFromCrmComment,
  markOrderChatInboxDraftSyncFailed,
  syncOrderChatInboxFromKaitenComments,
} from "@/lib/order-chat-inbox-db";

describe("order-chat-inbox-db", () => {
  const emptyUsersDb = () =>
    ({
      user: { findMany: vi.fn().mockResolvedValue([]) },
    }) as const;

  it("creates deterministic inbox items from CRM comment triggers", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const db = { orderChatInboxItem: { upsert }, ...emptyUsersDb() } as any;
    const changed = await createOrderChatInboxItemsFromCrmComment(db, {
      tenantId: "t1",
      orderId: "o1",
      text: "!!! тест @clicklab",
      authorLabel: "Менеджер",
      kanbanAdminMentionTag: "clicklab",
      crmDraftId: "cm_abc12345",
      syncState: "PENDING_EXTERNAL",
      source: "DEMO_KANBAN",
    });
    expect(changed).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(2); // correction + lab mention
  });

  it("binds crm draft to kaiten comment id", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = { orderChatInboxItem: { updateMany } } as any;
    const changed = await bindOrderChatInboxItemsByCrmDraft(db, {
      orderId: "o1",
      crmDraftId: "cm_abc12345",
      kaitenCommentId: 123,
    });
    expect(changed).toBe(true);
    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany.mock.calls[0]?.[0]?.where?.OR).toEqual([
      { crmDraftId: "cm_abc12345" },
      { crmDraftId: { startsWith: "cm_abc12345@u:" } },
    ]);
    expect(updateMany.mock.calls[0]?.[0]?.where?.NOT).toEqual({
      type: "USER_MENTION",
    });
    expect(updateMany.mock.calls[1]?.[0]?.data).toEqual({
      syncState: "SYNCED_EXTERNAL",
    });
  });

  it("при sync из Kaiten без DRAFT обновляет pending USER_MENTION, а не плодит k:", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(null) // by kaitenCommentId
      .mockResolvedValueOnce({ id: "inbox-1" }); // pending CRM draft
    const update = vi.fn().mockResolvedValue({});
    const upsert = vi.fn().mockResolvedValue({});
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "u-demon",
        mentionHandle: "digitaldemon",
        email: null,
        displayName: null,
        role: "OWNER",
      },
    ]);
    const db = {
      orderChatInboxItem: { findFirst, update, upsert, updateMany },
      user: { findMany },
    } as any;
    await syncOrderChatInboxFromKaitenComments(db, {
      tenantId: "t1",
      orderId: "o1",
      comments: [{ id: 99, text: "@digitaldemon тест", authorName: "Всеволод" }],
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inbox-1" },
        data: expect.objectContaining({ syncState: "SYNCED_EXTERNAL" }),
      }),
    );
    expect(update.mock.calls[0]?.[0]?.data?.kaitenCommentId).toBeUndefined();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("marks pending draft rows as failed when sync fails", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const db = { orderChatInboxItem: { updateMany } } as any;
    const changed = await markOrderChatInboxDraftSyncFailed(db, {
      orderId: "o1",
      crmDraftId: "cm_abc12345",
    });
    expect(changed).toBe(true);
    expect(updateMany).toHaveBeenCalledOnce();
  });

  it("upserts external kaiten comments by deterministic key", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const upsert = vi.fn().mockResolvedValue({});
    const db = {
      orderChatInboxItem: {
        updateMany,
        upsert,
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      orderChatCorrection: { findFirst: vi.fn().mockResolvedValue(null) },
      orderProstheticsRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      ...emptyUsersDb(),
    } as any;
    const result = await syncOrderChatInboxFromKaitenComments(db, {
      tenantId: "t1",
      orderId: "o1",
      kanbanAdminMentionTag: "clicklab",
      comments: [
        {
          id: 77,
          text: "??? протетика @clicklab",
          authorName: "Kaiten User",
        },
      ],
    });
    expect(result.changed).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(2); // prosthetics + lab mention
  });

  it("не создаёт новую inbox-заявку, если legacy уже исполнена", async () => {
    const create = vi.fn().mockResolvedValue({});
    const upsert = vi.fn();
    const db = {
      orderChatInboxItem: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        upsert,
        create,
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      orderChatCorrection: {
        findFirst: vi.fn().mockResolvedValue({
          resolvedAt: new Date("2026-07-10T10:00:00Z"),
          resolvedByUserId: "u1",
          rejectedAt: null,
          rejectedByUserId: null,
        }),
      },
      orderProstheticsRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      ...emptyUsersDb(),
    } as any;
    await syncOrderChatInboxFromKaitenComments(db, {
      tenantId: "t1",
      orderId: "o1",
      comments: [
        {
          id: 501,
          text: "!!! цвет с вестибулярной стороны 14",
          authorName: "Роман",
        },
      ],
    });
    expect(upsert).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "CORRECTION",
        kaitenCommentId: 501,
        resolvedAt: new Date("2026-07-10T10:00:00Z"),
        resolvedByUserId: "u1",
      }),
    });
  });

  it("при sync с kaitenCommentId обновляет уже связанную строку, не создаёт k:", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce({ id: "inbox-bound" }); // by kaitenCommentId
    const update = vi.fn().mockResolvedValue({});
    const upsert = vi.fn().mockResolvedValue({});
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "u-demon",
        mentionHandle: "digitaldemon",
        email: null,
        displayName: null,
        role: "OWNER",
      },
    ]);
    const db = {
      orderChatInboxItem: { findFirst, update, upsert, updateMany: vi.fn() },
      user: { findMany },
    } as any;
    await syncOrderChatInboxFromKaitenComments(db, {
      tenantId: "t1",
      orderId: "o1",
      comments: [
        {
          id: 99,
          text: "@digitaldemon ntnc tg",
          authorName: "Всеволод",
          crmDraftId: "cm-1785443244178-9kio3n",
        },
      ],
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "inbox-bound" } }),
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it("два @ в одном комментарии — две USER_MENTION без общего kaitenCommentId", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const findUnique = vi.fn().mockResolvedValue(null);
    const upsert = vi.fn().mockResolvedValue({});
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "u-zed",
        mentionHandle: "zedpomaps",
        email: null,
        displayName: null,
        role: "PRODUCTION",
      },
      {
        id: "u-demon",
        mentionHandle: "digitaldemon",
        email: null,
        displayName: null,
        role: "OWNER",
      },
    ]);
    const db = {
      orderChatInboxItem: {
        findFirst,
        findUnique,
        upsert,
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        update: vi.fn(),
      },
      user: { findMany },
    } as any;
    const result = await syncOrderChatInboxFromKaitenComments(db, {
      tenantId: "t1",
      orderId: "o1",
      comments: [
        {
          id: 55,
          text: "@digitaldemon @zedpomaps",
          authorName: "ClickLAB",
        },
      ],
    });
    const mentionCreates = upsert.mock.calls.filter(
      (c) => c[0]?.create?.type === "USER_MENTION",
    );
    expect(mentionCreates).toHaveLength(2);
    for (const call of mentionCreates) {
      expect(call[0].create.kaitenCommentId).toBeNull();
    }
    expect(result.newPersonalMentions[0]?.targetUserIds.sort()).toEqual(
      ["u-demon", "u-zed"].sort(),
    );
  });
});

