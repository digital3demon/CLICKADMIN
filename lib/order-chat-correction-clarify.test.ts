import { describe, expect, it } from "vitest";
import {
  clarifyHasUnreadReply,
  findClarifyReply,
  pickChatReplyToId,
} from "@/lib/order-chat-correction-clarify";

describe("order-chat-correction-clarify", () => {
  it("pickChatReplyToId: кириллица вокруг тела заявки", () => {
    const comments = [
      {
        id: "crm-1",
        text: "!!! Надо глянуть че тут выставляли ранее, 13ед пмма",
        externalCommentId: "901",
      },
    ];
    expect(
      pickChatReplyToId(901, comments, "Надо глянуть че тут выставляли ранее, 13ед пмма"),
    ).toBe("crm-1");
    expect(
      pickChatReplyToId(null, comments, "Надо глянуть че тут выставляли ранее, 13ед пмма"),
    ).toBe("crm-1");
  });

  it("findClarifyReply: чужой ответ в треде после уточнения", () => {
    const comments = [
      {
        id: "root",
        text: "!!! Заявка про пмма",
        createdAt: "2026-08-25T20:00:00.000Z",
        externalCommentId: "10",
      },
      {
        id: "q1",
        parentId: "root",
        userId: "admin-1",
        text: "Уточните объём",
        createdAt: "2026-08-25T21:00:00.000Z",
      },
      {
        id: "a1",
        parentId: "q1",
        userId: "tech-9",
        authorLabel: "Всеволод Соколов",
        text: "Было 13ед пмма, 9 опор",
        createdAt: "2026-08-25T22:00:00.000Z",
      },
    ];
    const hit = findClarifyReply(comments, {
      kaitenCommentId: 10,
      text: "Заявка про пмма",
      clarifyAskedAt: "2026-08-25T21:00:00.000Z",
      clarifyAskedByUserId: "admin-1",
      clarifyCommentId: "q1",
      clarifyReplyAt: null,
      clarifyReplyAckAt: null,
    });
    expect(hit?.id).toBe("a1");
  });

  it("findClarifyReply: свой повтор не считается ответом", () => {
    const comments = [
      {
        id: "root",
        createdAt: "2026-08-25T20:00:00.000Z",
        externalCommentId: "10",
        text: "!!! x",
      },
      {
        id: "q2",
        parentId: "root",
        userId: "admin-1",
        createdAt: "2026-08-25T21:10:00.000Z",
        text: "ещё раз",
      },
    ];
    expect(
      findClarifyReply(comments, {
        kaitenCommentId: 10,
        text: "x",
        clarifyAskedAt: "2026-08-25T21:00:00.000Z",
        clarifyAskedByUserId: "admin-1",
        clarifyCommentId: "q1",
        clarifyReplyAt: null,
        clarifyReplyAckAt: null,
      }),
    ).toBeNull();
  });

  it("clarifyHasUnreadReply: новый ответ после ack снова непрочитан", () => {
    expect(
      clarifyHasUnreadReply({
        clarifyReplyAt: "2026-08-25T22:00:00.000Z",
        clarifyReplyAckAt: "2026-08-25T21:50:00.000Z",
      }),
    ).toBe(true);
    expect(
      clarifyHasUnreadReply({
        clarifyReplyAt: "2026-08-25T22:00:00.000Z",
        clarifyReplyAckAt: "2026-08-25T22:10:00.000Z",
      }),
    ).toBe(false);
  });
});
