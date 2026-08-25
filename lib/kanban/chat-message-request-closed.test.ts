import { describe, expect, it } from "vitest";
import {
  isKanbanChatCommentRequestClosed,
  isKanbanChatRequestLifecycleClosed,
  mergeRequestClosedFlags,
  pickMatchingKanbanChatRequestRow,
} from "./chat-message-request-closed";

describe("isKanbanChatRequestLifecycleClosed", () => {
  it("закрыта после внесения корректировки или заказа протетики", () => {
    expect(isKanbanChatRequestLifecycleClosed({})).toBe(false);
    expect(
      isKanbanChatRequestLifecycleClosed({
        resolvedAt: "2026-08-25T10:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      isKanbanChatRequestLifecycleClosed({
        orderedAt: "2026-08-25T10:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      isKanbanChatRequestLifecycleClosed({
        rejectedAt: "2026-08-25T10:00:00.000Z",
      }),
    ).toBe(true);
  });
});

describe("isKanbanChatCommentRequestClosed", () => {
  it("матчит !!! с кириллицей до и после и закрытую заявку по crmDraftId", () => {
    const comment = {
      id: "cm-abc",
      text: "!!! Срок от 10.02.2026 уточнить у клиники",
      createdAt: "2026-08-25T08:00:00.000Z",
      externalCommentId: null,
    };
    expect(
      isKanbanChatCommentRequestClosed(comment, [
        {
          kind: "correction",
          text: "Срок от 10.02.2026 уточнить у клиники",
          createdAt: "2026-08-25T08:00:01.000Z",
          crmDraftId: "cm-abc",
          resolvedAt: "2026-08-25T09:00:00.000Z",
        },
      ]),
    ).toBe(true);
    expect(
      isKanbanChatCommentRequestClosed(comment, [
        {
          kind: "correction",
          text: "Срок от 10.02.2026 уточнить у клиники",
          createdAt: "2026-08-25T08:00:01.000Z",
          crmDraftId: "cm-abc",
          resolvedAt: null,
        },
      ]),
    ).toBe(false);
  });

  it("матчит заказ протетики по тексту без ??? и считает заказанную закрытой", () => {
    const comment = {
      id: "cm-pt",
      text: "??? ЗАКАЗ ПРОТЕТИКИ\n02085 1шт",
      createdAt: "2026-08-25T08:00:00.000Z",
      externalCommentId: null,
    };
    expect(
      isKanbanChatCommentRequestClosed(comment, [
        {
          kind: "prosthetics",
          text: "ЗАКАЗ ПРОТЕТИКИ\n02085 1шт",
          createdAt: "2026-08-25T08:00:00.000Z",
          orderedAt: "2026-08-25T09:30:00.000Z",
        },
      ]),
    ).toBe(true);
  });

  it("из двух одинаковых текстов берёт ближайшую по времени", () => {
    const comment = {
      id: "cm-new",
      text: "??? 01125 3шт",
      createdAt: "2026-08-25T12:00:00.000Z",
      externalCommentId: null,
    };
    const match = pickMatchingKanbanChatRequestRow(comment, [
      {
        kind: "prosthetics",
        text: "01125 3шт",
        createdAt: "2026-08-24T08:00:00.000Z",
        orderedAt: "2026-08-24T10:00:00.000Z",
      },
      {
        kind: "prosthetics",
        text: "01125 3шт",
        createdAt: "2026-08-25T12:00:02.000Z",
        orderedAt: null,
      },
    ]);
    expect(match?.orderedAt).toBeNull();
    expect(isKanbanChatCommentRequestClosed(comment, [match!])).toBe(false);
  });
});

describe("mergeRequestClosedFlags", () => {
  it("переносит закрытие по id после merge", () => {
    const merged = mergeRequestClosedFlags(
      [
        {
          id: "cm-pt",
          userId: "u1",
          text: "??? 02085 1шт",
          createdAt: "2026-08-25T08:00:00.000Z",
        },
      ],
      [
        {
          id: "cm-pt",
          requestClosed: true,
        },
      ],
    );
    expect(merged[0]?.requestClosed).toBe(true);
  });
});
