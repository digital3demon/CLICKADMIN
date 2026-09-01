import { describe, expect, it } from "vitest";
import {
  compactCardComments,
  findCardByLinkedOrderId,
  findKanbanCardsForKaitenRefresh,
  linkedOrderKanbanPresence,
  mergeKaitenSnapshotIntoCardComments,
  upsertKaitenCommentsToCard,
} from "./chat-sync";
import { KANBAN_STOP_COLUMN_TITLE } from "./kanban-stop-column";
import type { CardComment, KanbanAppState, KanbanCard } from "./types";

describe("kanban chat sync", () => {
  it("CRM readback с DRAFT не добавляет второе сообщение в канбан", () => {
    const existing: CardComment[] = [
      {
        id: "cm-local-1",
        userId: "u1",
        text: "@digitaldemon тест",
        createdAt: "2026-08-08T12:00:00.000Z",
        authorLabel: "Всеволод Соколов",
        source: "CRM",
        syncStatus: "pending",
      },
    ];
    const merged = upsertKaitenCommentsToCard(existing, [
      {
        id: 7788,
        text: "@digitaldemon тест",
        created: "2026-08-08T12:00:01.000Z",
        authorName: "Всеволод Соколов",
        parentId: null,
        isCrm: true,
        crmDraftId: "cm-local-1",
      },
    ]);
    expect(merged.next).toHaveLength(1);
    expect(merged.next[0]?.id).toBe("cm-local-1");
    expect(merged.next[0]?.source).toBe("CRM");
    expect(merged.next[0]?.externalCommentId).toBe("7788");
    expect(merged.next[0]?.syncStatus).toBe("synced");
  });

  it("CRM readback без локальной строки не создаёт source=KAITEN", () => {
    const merged = upsertKaitenCommentsToCard([], [
      {
        id: 8899,
        text: "из канбана",
        created: "2026-08-08T12:00:00.000Z",
        authorName: "Всеволод",
        isCrm: true,
        crmDraftId: "cm-abc",
      },
    ]);
    expect(merged.next).toHaveLength(1);
    expect(merged.next[0]?.source).toBe("CRM");
    expect(merged.next[0]?.id).toBe("cm-abc");
    expect(merged.next[0]?.externalCommentId).toBe("8899");
  });

  it("сохраняет CRM-origin у комментария, отправленного из канбана и синкнутого в Kaiten", () => {
    const existing: CardComment[] = [
      {
        id: "cm-1",
        userId: "u1",
        text: "!!! тест канбан",
        createdAt: "2026-07-03T12:00:00.000Z",
        authorLabel: "Всеволод Соколов",
        externalCommentId: "123",
        source: "CRM",
        syncStatus: "synced",
        syncedAt: "2026-07-03T12:00:01.000Z",
      },
    ];

    const result = upsertKaitenCommentsToCard(existing, [
      {
        id: 123,
        text: "!!! тест канбан",
        created: "2026-07-03T12:00:02.000Z",
        authorName: "Всеволод Соколов",
        parentId: null,
      },
    ]);

    expect(result.next).toHaveLength(1);
    expect(result.next[0]?.source).toBe("CRM");
    expect(result.next[0]?.syncStatus).toBe("synced");
    expect(result.next[0]?.externalCommentId).toBe("123");
  });

  it("не воскрешает удалённый CRM-комментарий из Kaiten", () => {
    const current: CardComment[] = [
      {
        id: "cm-gone",
        userId: "u1",
        text: "было",
        createdAt: "2026-05-07T10:00:00.000Z",
        externalCommentId: "1001",
        source: "CRM",
        syncStatus: "synced",
        deletedAt: "2026-05-07T11:00:00.000Z",
      },
    ];
    const merged = upsertKaitenCommentsToCard(current, [
      {
        id: 1001,
        text: "было",
        created: "2026-05-07T10:00:00.000Z",
        authorName: "Автор",
        isCrm: true,
        crmDraftId: "cm-gone",
      },
    ]);
    expect(merged.next).toHaveLength(1);
    expect(merged.next[0]?.deletedAt).toBe("2026-05-07T11:00:00.000Z");
    expect(merged.next[0]?.text).toBe("было");
  });

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

  it("absorbs orphan CRM comment when kaiten comment with same text arrives", () => {
    const current: CardComment[] = [
      {
        id: "cm-local",
        userId: "u1",
        text: "сфоткайте пожалуйста основание",
        createdAt: "2026-05-07T10:00:00.000Z",
        source: "CRM",
        syncStatus: "pending",
      },
    ];
    const merged = upsertKaitenCommentsToCard(current, [
      {
        id: 5001,
        text: "сфоткайте пожалуйста основание",
        created: "2026-05-07T10:00:01.000Z",
        authorName: "Марк",
        parentId: null,
      },
    ]);
    expect(merged.next.length).toBe(1);
    expect(merged.next[0]?.id).toBe("cm-local");
    expect(merged.next[0]?.externalCommentId).toBe("5001");
    expect(merged.next[0]?.syncStatus).toBe("synced");
  });

  it("не схлопывает orphan CRM с другим автором при readback Kaiten", () => {
    const current: CardComment[] = [
      {
        id: "cm-local",
        userId: "u1",
        text: "сфоткайте пожалуйста основание",
        createdAt: "2026-05-07T10:00:00.000Z",
        authorLabel: "Марк",
        source: "CRM",
        syncStatus: "pending",
      },
    ];
    const merged = upsertKaitenCommentsToCard(current, [
      {
        id: 5002,
        text: "сфоткайте пожалуйста основание",
        created: "2026-05-07T10:00:01.000Z",
        authorName: "Анна",
        parentId: null,
      },
    ]);
    expect(merged.next.length).toBe(2);
    expect(merged.next.find((c) => c.source === "KAITEN")?.externalCommentId).toBe("5002");
  });

  it("compactCardComments removes duplicate CRM rows with same text", () => {
    const rows: CardComment[] = [
      {
        id: "cm-1",
        userId: "u1",
        text: "сфоткайте пожалуйста основание",
        createdAt: "2026-05-07T10:00:00.000Z",
        authorLabel: "Марк",
        source: "CRM",
        syncStatus: "local",
      },
      {
        id: "cm-2",
        userId: "u1",
        text: "сфоткайте пожалуйста основание",
        createdAt: "2026-05-07T10:01:00.000Z",
        authorLabel: "Марк",
        source: "CRM",
        syncStatus: "local",
      },
      {
        id: "kt-9001",
        userId: "",
        text: "сфоткайте пожалуйста основание",
        createdAt: "2026-05-07T10:02:00.000Z",
        authorLabel: "Марк",
        externalCommentId: "9001",
        source: "KAITEN",
        syncStatus: "synced",
      },
    ];
    const out = compactCardComments(rows);
    expect(out.length).toBe(1);
    expect(out[0]?.externalCommentId).toBe("9001");
  });

  it("compactCardComments collapses several Kaiten posts with same body", () => {
    const rows: CardComment[] = [
      {
        id: "kt-101",
        userId: "",
        text: "сфоткайте пожалуйста основание",
        createdAt: "2026-05-07T10:00:00.000Z",
        authorLabel: "Марк",
        externalCommentId: "101",
        source: "KAITEN",
        syncStatus: "synced",
      },
      {
        id: "kt-102",
        userId: "",
        text: "сфоткайте пожалуйста основание",
        createdAt: "2026-05-07T10:00:30.000Z",
        authorLabel: "Марк",
        externalCommentId: "102",
        source: "KAITEN",
        syncStatus: "synced",
      },
      {
        id: "kt-103",
        userId: "",
        text: "сфоткайте пожалуйста основание",
        createdAt: "2026-05-07T10:01:00.000Z",
        authorLabel: "Марк",
        externalCommentId: "103",
        source: "KAITEN",
        syncStatus: "synced",
      },
    ];
    expect(compactCardComments(rows).length).toBe(1);
  });

  it("mergeKaitenSnapshotIntoCardComments keeps single row after poll", () => {
    const existing: CardComment[] = [
      {
        id: "cm-local",
        userId: "u1",
        text: "Привет",
        createdAt: "2026-05-07T10:00:00.000Z",
        source: "CRM",
        syncStatus: "pending",
      },
    ];
    const snapshot: CardComment[] = [
      {
        id: "kt-6001",
        userId: "u1",
        text: "Привет",
        createdAt: "2026-05-07T10:00:01.000Z",
        externalCommentId: "6001",
        source: "KAITEN",
        syncStatus: "synced",
      },
    ];
    const merged = mergeKaitenSnapshotIntoCardComments(existing, snapshot);
    expect(merged.length).toBe(1);
    expect(merged[0]?.id).toBe("cm-local");
  });
});

describe("findKanbanCardsForKaitenRefresh", () => {
  it("находит карточку по linkedOrderId, если cardId клиента другой (кириллица рядом)", () => {
    const state = {
      activeBoardId: "ortho",
      boards: [
        {
          id: "ortho",
          title: "Ортопедия",
          columns: [
            {
              id: "c",
              cards: [
                {
                  id: "kc-68058214",
                  title: "2608-12 Крупышева Е.Ю.",
                  linkedOrderId: "ord-а",
                  kaitenCardId: 68058214,
                } as KanbanCard,
              ],
            },
          ],
        },
      ],
    } as unknown as KanbanAppState;
    const hits = findKanbanCardsForKaitenRefresh(state, {
      cardId: "order-ord-а",
      linkedOrderId: "ord-а",
      kaitenCardId: 68058214,
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.card.id).toBe("kc-68058214");
    expect(hits[0]?.colLoc).toEqual({
      boardIndex: 0,
      columnIndex: 0,
      cardIndex: 0,
    });
  });

  it("находит СТОП по kaitenCardId без совпадения cardId", () => {
    const state = {
      activeBoardId: "ortho",
      boards: [
        {
          id: "ortho",
          title: "Ортопедия",
          columns: [{ id: "c", cards: [] }],
          stoppedCards: [
            {
              card: {
                id: "stop-local",
                title: "СТОП наряд",
                linkedOrderId: "ord-s",
                kaitenCardId: 99,
              } as KanbanCard,
            },
          ],
        },
      ],
    } as unknown as KanbanAppState;
    const hits = findKanbanCardsForKaitenRefresh(state, {
      cardId: "чужой-id",
      linkedOrderId: null,
      kaitenCardId: 99,
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.card.id).toBe("stop-local");
    expect(hits[0]?.colLoc).toBeNull();
  });

  it("не берёт архив", () => {
    const state = {
      activeBoardId: "ortho",
      boards: [
        {
          id: "ortho",
          title: "Ортопедия",
          columns: [{ id: "c", cards: [] }],
          archivedCards: [
            {
              card: {
                id: "arch",
                linkedOrderId: "ord-arch",
                kaitenCardId: 8,
              } as KanbanCard,
            },
          ],
        },
      ],
    } as unknown as KanbanAppState;
    expect(
      findKanbanCardsForKaitenRefresh(state, {
        cardId: "нет",
        linkedOrderId: "ord-arch",
        kaitenCardId: 8,
      }),
    ).toEqual([]);
  });
});

describe("linkedOrderKanbanPresence", () => {
  it("карточка в СТОП считается присутствующей (кириллица до и после id)", () => {
    const state = {
      activeBoardId: "odon",
      boards: [
        {
          id: "odon",
          title: "Ортодонтия",
          columns: [{ id: "c", title: "К исполнению", cards: [] }],
          stoppedCards: [
            {
              id: "stop-1",
              card: {
                id: "card-стоп",
                linkedOrderId: "наряд-178",
                title: "заказ 178 от 10.02.2026 Смирнов",
              } as KanbanCard,
            },
          ],
        },
      ],
    } as unknown as KanbanAppState;
    const hit = linkedOrderKanbanPresence(state, "наряд-178");
    expect(hit.hasCard).toBe(true);
    expect(hit.stopped).toBe(true);
    expect(hit.columnTitle).toBe(KANBAN_STOP_COLUMN_TITLE);
    expect(hit.cardId).toBe("card-стоп");
    expect(hit.boardId).toBe("odon");
    expect(findCardByLinkedOrderId(state, "наряд-178")).toBeNull();
  });

  it("колонка на доске — hasCard без stopped", () => {
    const state = {
      activeBoardId: "odon",
      boards: [
        {
          id: "odon",
          title: "Ортодонтия",
          columns: [
            {
              id: "c",
              title: "К исполнению",
              cards: [
                {
                  id: "card-жив",
                  linkedOrderId: "наряд-жив",
                  title: "живой наряд",
                } as KanbanCard,
              ],
            },
          ],
          stoppedCards: [],
        },
      ],
    } as unknown as KanbanAppState;
    const hit = linkedOrderKanbanPresence(state, "наряд-жив");
    expect(hit.hasCard).toBe(true);
    expect(hit.stopped).toBe(false);
    expect(hit.columnTitle).toBe("К исполнению");
  });
});
