import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  advanceKaitenLabMentionWaterlineOnly,
  syncKaitenLabMentionFromParsedComments,
  syncCrmLabMentionFromCommentText,
} from "@/lib/order-kaiten-lab-mention-db";

describe("syncCrmLabMentionFromCommentText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("не трогает заказ без @lab в тексте", async () => {
    const findUnique = vi.fn();
    const db = { order: { findUnique, update: vi.fn() } } as never;

    const changed = await syncCrmLabMentionFromCommentText(
      db,
      "o1",
      "обычный комментарий",
      "Админ",
      "clicklab",
    );

    expect(changed).toBe(false);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("сразу поднимает kaitenLabMentionSignalAt для @ClickLab", async () => {
    const update = vi.fn().mockResolvedValue({});
    const db = {
      order: {
        findUnique: vi.fn().mockResolvedValue({ id: "o1" }),
        update,
      },
    } as never;

    const changed = await syncCrmLabMentionFromCommentText(
      db,
      "o1",
      "@ClickLab срочно посмотрите",
      "Марк",
      "clicklab",
    );

    expect(changed).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "o1" },
        data: expect.objectContaining({
          kaitenChatHasLabMention: true,
          kaitenLabMentionSignalAt: expect.any(Date),
          kaitenLabMentionToastAuthor: "Марк",
          kaitenLabMentionToastText: "@ClickLab срочно посмотрите",
        }),
      }),
    );
  });
});

describe("advanceKaitenLabMentionWaterlineOnly", () => {
  it("двигает waterline без bump сигнала", async () => {
    const update = vi.fn().mockResolvedValue({});
    const db = {
      order: {
        findUnique: vi.fn().mockResolvedValue({ kaitenLabMentionWaterlineCommentId: 100 }),
        update,
      },
    } as never;

    const changed = await advanceKaitenLabMentionWaterlineOnly(db, "o1", 5001);

    expect(changed).toBe(true);
    expect(update).toHaveBeenCalledWith({
      where: { id: "o1" },
      data: { kaitenLabMentionWaterlineCommentId: 5001 },
    });
  });

  it("не откатывает waterline назад", async () => {
    const update = vi.fn();
    const db = {
      order: {
        findUnique: vi.fn().mockResolvedValue({ kaitenLabMentionWaterlineCommentId: 9000 }),
        update,
      },
    } as never;

    const changed = await advanceKaitenLabMentionWaterlineOnly(db, "o1", 5001);

    expect(changed).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});

describe("syncKaitenLabMentionFromParsedComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("поднимает signal для нового @lab даже если комментарий помечен isCrm", async () => {
    const update = vi.fn().mockResolvedValue({});
    const db = {
      order: {
        findUnique: vi.fn().mockResolvedValue({
          kaitenChatHasLabMention: false,
          kaitenLabMentionWaterlineCommentId: 100,
        }),
        update,
      },
    } as never;

    const changed = await syncKaitenLabMentionFromParsedComments(
      db,
      "o1",
      [
        {
          id: 101,
          text: "@ClickLab кайтен тест",
          authorName: "Kaiten User",
          isCrm: true,
        },
      ],
      "clicklab",
    );

    expect(changed).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "o1" },
        data: expect.objectContaining({
          kaitenChatHasLabMention: true,
          kaitenLabMentionWaterlineCommentId: 101,
          kaitenLabMentionSignalAt: expect.any(Date),
          kaitenLabMentionToastAuthor: "Kaiten User",
          kaitenLabMentionToastText: "@ClickLab кайтен тест",
        }),
      }),
    );
  });
});
