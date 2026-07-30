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
    expect(updateMany).toHaveBeenCalledOnce();
    expect(updateMany.mock.calls[0]?.[0]?.where?.OR).toEqual([
      { crmDraftId: "cm_abc12345" },
      { crmDraftId: { startsWith: "cm_abc12345@u:" } },
    ]);
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
        data: expect.objectContaining({ kaitenCommentId: 99 }),
      }),
    );
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
      orderChatInboxItem: { updateMany, upsert },
      ...emptyUsersDb(),
    } as any;
    const changed = await syncOrderChatInboxFromKaitenComments(db, {
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
    expect(changed).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(2); // prosthetics + lab mention
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
});

