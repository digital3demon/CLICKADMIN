import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ingestCrmKanbanCommentForOrder,
  ingestKaitenCommentsForOrder,
  kaitenParsedCommentsToKanbanSyncRows,
} from "@/lib/kanban/kaiten-comments-ingest-server";

const syncCorrections = vi.fn();
const syncProsthetics = vi.fn();
const syncLabMention = vi.fn();
const syncCrmLabMention = vi.fn();
const advanceWaterline = vi.fn();
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
  syncCrmLabMentionFromCommentText: (...args: unknown[]) =>
    syncCrmLabMention(...args),
  advanceKaitenLabMentionWaterlineOnly: (...args: unknown[]) =>
    advanceWaterline(...args),
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
    syncCrmLabMention.mockResolvedValue(true);
    advanceWaterline.mockResolvedValue(true);
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

describe("ingestCrmKanbanCommentForOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncCrmLabMention.mockResolvedValue(true);
    advanceWaterline.mockResolvedValue(true);
  });

  it("сразу синхронизирует @lab из CRM-текста", async () => {
    const prisma = {} as never;
    const result = await ingestCrmKanbanCommentForOrder({
      prisma,
      orderId: "o1",
      commentText: "@clicklab проверьте",
      authorLabel: "Админ",
      kanbanAdminMentionTag: "clicklab",
    });

    expect(syncCrmLabMention).toHaveBeenCalledWith(
      prisma,
      "o1",
      "@clicklab проверьте",
      "Админ",
      "clicklab",
    );
    expect(advanceWaterline).not.toHaveBeenCalled();
    expect(result).toEqual({ labMentionDbChanged: true, waterlineAdvanced: false });
  });

  it("после id Kaiten двигает только waterline", async () => {
    syncCrmLabMention.mockResolvedValue(false);
    const prisma = {} as never;

    const result = await ingestCrmKanbanCommentForOrder({
      prisma,
      orderId: "o1",
      commentText: "plain",
      kaitenCommentIdForWaterline: 777,
    });

    expect(advanceWaterline).toHaveBeenCalledWith(prisma, "o1", 777);
    expect(result).toEqual({ labMentionDbChanged: false, waterlineAdvanced: true });
  });
});
