import { describe, expect, it } from "vitest";
import { upsertKaitenCommentsToCard } from "./chat-sync";
import type { CardComment } from "./types";

describe("kanban chat sync", () => {
  it("adds new kaiten comments with external id and synced status", () => {
    const current: CardComment[] = [];
    const merged = upsertKaitenCommentsToCard(current, [
      {
        id: 1001,
        text: "Комментарий из Kaiten",
        created: "2026-05-07T10:00:00.000Z",
        authorName: "Kaiten User",
        parentId: null,
      },
    ]);
    expect(merged.changed).toBe(true);
    expect(merged.next.length).toBe(1);
    expect(merged.next[0]?.externalCommentId).toBe("1001");
    expect(merged.next[0]?.source).toBe("KAITEN");
    expect(merged.next[0]?.syncStatus).toBe("synced");
  });

  it("does not duplicate crm comment when same external id appears from kaiten", () => {
    const current: CardComment[] = [
      {
        id: "cm-local",
        userId: "u1",
        text: "Локально отправлено",
        createdAt: "2026-05-07T10:00:00.000Z",
        externalCommentId: "2002",
        source: "CRM",
        syncStatus: "synced",
      },
    ];
    const merged = upsertKaitenCommentsToCard(current, [
      {
        id: 2002,
        text: "Локально отправлено",
        created: "2026-05-07T10:00:00.000Z",
        authorName: "CRM User",
        parentId: null,
      },
    ]);
    expect(merged.next.length).toBe(1);
    expect(merged.next[0]?.id).toBe("cm-local");
  });

  it("resolves local parent ids by kaiten external parent id", () => {
    const current: CardComment[] = [];
    const merged = upsertKaitenCommentsToCard(current, [
      {
        id: 3001,
        text: "Root",
        created: "2026-05-07T10:00:00.000Z",
        parentId: null,
      },
      {
        id: 3002,
        text: "Reply",
        created: "2026-05-07T10:01:00.000Z",
        parentId: 3001,
      },
    ]);
    const root = merged.next.find((x) => x.externalCommentId === "3001");
    const reply = merged.next.find((x) => x.externalCommentId === "3002");
    expect(root?.id).toBeTruthy();
    expect(reply?.parentId).toBe(root?.id ?? null);
  });

  it("does not create duplicates when same kaiten payload ingested twice", () => {
    const first = upsertKaitenCommentsToCard([], [
      { id: 4001, text: "Ping", created: "2026-05-07T10:00:00.000Z", parentId: null },
    ]);
    const second = upsertKaitenCommentsToCard(first.next, [
      { id: 4001, text: "Ping", created: "2026-05-07T10:00:00.000Z", parentId: null },
    ]);
    expect(first.next.length).toBe(1);
    expect(second.next.length).toBe(1);
    expect(second.changed).toBe(false);
  });
});
