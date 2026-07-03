import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ingestKaitenCommentsForOrder,
  kaitenParsedCommentsToKanbanSyncRows,
} from "@/lib/kanban/kaiten-comments-ingest-server";

const syncCorrections = vi.fn();
const syncProsthetics = vi.fn();
const syncLabMention = vi.fn();
const syncKanbanMirror = vi.fn();

vi.mock("@/lib/order-chat-correction-db", () => ({
  syncOrderChatCorrectionsFromKaitenComments: (...args: unknown[]) =>
    syncCorrections(...args),
}));

vi.mock("@/lib/order-prosthetics-request-db", () => ({
  syncOrderProstheticsRequestsFromKaitenComments: (...args: unknown[]) =>
    syncProsthetics(...args),
}));

vi.mock("@/lib/order-kaiten-lab-mention-db", () => ({
  syncKaitenLabMentionFromParsedComments: (...args: unknown[]) =>
    syncLabMention(...args),
}));

vi.mock("@/lib/kanban/chat-sync-server", () => ({
  syncKaitenCommentsIntoKanbanState: (...args: unknown[]) => syncKanbanMirror(...args),
}));

describe("kaitenParsedCommentsToKanbanSyncRows", () => {
  it("пробрасывает id/text/created для mirror", () => {
    const rows = kaitenParsedCommentsToKanbanSyncRows([
      {
        id: 42,
        text: "@ClickLab тест",
        created: "2026-07-03T12:00:00.000Z",
        authorName: "Админ",
        parentId: null,
      },
    ]);
    expect(rows[0]).toEqual({
      id: 42,
      text: "@ClickLab тест",
      created: "2026-07-03T12:00:00.000Z",
      authorName: "Админ",
      parentId: null,
    });
  });
});

describe("ingestKaitenCommentsForOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncLabMention.mockResolvedValue(true);
    syncKanbanMirror.mockResolvedValue({ changed: true, skipped: false });
  });

  it("обновляет lab mention и kanban mirror вместе с триггерами", async () => {
    const prisma = {} as never;
    const parsed = [{ id: 1, text: "@ClickLab кайтен тест чат", authorName: "CRM" }];

    const result = await ingestKaitenCommentsForOrder({
      prisma,
      tenantId: "t1",
      orderId: "o1",
      parsed,
      kanbanAdminMentionTag: "clicklab",
    });

    expect(syncCorrections).toHaveBeenCalledOnce();
    expect(syncProsthetics).toHaveBeenCalledOnce();
    expect(syncLabMention).toHaveBeenCalledWith(
      prisma,
      "o1",
      [{ id: 1, text: "@ClickLab кайтен тест чат", authorName: "CRM" }],
      "clicklab",
    );
    expect(syncKanbanMirror).toHaveBeenCalledWith({
      tenantId: "t1",
      orderId: "o1",
      comments: kaitenParsedCommentsToKanbanSyncRows(parsed),
    });
    expect(result).toEqual({ labMentionDbChanged: true, kanbanMirrorChanged: true });
  });

  it("skipLabMention не трогает сигнал заказов", async () => {
    await ingestKaitenCommentsForOrder({
      prisma: {} as never,
      tenantId: "t1",
      orderId: "o1",
      parsed: [{ id: 2, text: "plain" }],
      skipLabMention: true,
    });
    expect(syncLabMention).not.toHaveBeenCalled();
  });
});
