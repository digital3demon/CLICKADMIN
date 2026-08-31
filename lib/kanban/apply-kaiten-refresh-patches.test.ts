import { describe, expect, it } from "vitest";
import {
  applyKaitenRefreshPatchesToState,
  slimKaitenHeadForPatch,
} from "./apply-kaiten-refresh-patches";
import type { KanbanAppState, KanbanCard } from "./types";

describe("slimKaitenHeadForPatch", () => {
  it("оставляет только asap и due_date", () => {
    const slim = slimKaitenHeadForPatch({
      asap: true,
      due_date: "2026-09-03",
      description: "x".repeat(5000),
      members: [{ id: 1 }],
    });
    expect(slim).toEqual({ asap: true, due_date: "2026-09-03", blocked: false });
  });

  it("нормализует срок из data.due_date (кириллица в title не нужна)", () => {
    const slim = slimKaitenHeadForPatch({
      data: {
        due_date: { date: "2026-09-08T00:00:00.000+03:00" },
        description: "описание",
      },
    });
    expect(slim).toEqual({ due_date: "2026-09-08", blocked: false });
  });

  it("тащит блок Kaiten в slim, кириллица в причине", () => {
    const slim = slimKaitenHeadForPatch({
      blocked: true,
      block_reason: "ждём КТ Тындик",
      description: "x".repeat(2000),
    });
    expect(slim).toMatchObject({
      blocked: true,
      block_reason: "ждём КТ Тындик",
    });
  });
});

describe("applyKaitenRefreshPatchesToState", () => {
  it("ставит срок и людей по linkedOrderId, если cardId другой (кириллица в title)", () => {
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
                  id: "kc-1",
                  title: "2608-12 Крупышева Е.Ю.",
                  linkedOrderId: "ord-а",
                  assignees: [],
                  participants: [],
                  dueDate: "",
                  urgent: false,
                } as KanbanCard,
              ],
            },
          ],
        },
      ],
    } as unknown as KanbanAppState;

    const { changed, state: next } = applyKaitenRefreshPatchesToState(state, [
      {
        cardId: "kaiten-order-ord-а",
        linkedOrderId: "ord-а",
        kaitenCardId: 68058214,
        assignees: ["u-oleg"],
        participants: ["u-roman"],
        fingerprint: "fp1",
        unmappedLabels: [],
        kaitenHead: { asap: false, due_date: "2026-09-03" },
      },
    ]);
    expect(changed).toBeGreaterThan(0);
    const card = next.boards[0]!.columns[0]!.cards[0]!;
    expect(card.assignees).toEqual(["u-oleg"]);
    expect(card.participants).toEqual(["u-roman"]);
    expect(card.stageDueDate).toBe("2026-09-03");
    expect(card.kaitenCardId).toBe(68058214);
  });

  it("ставит блок с Kaiten на карточку по наряду", () => {
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
                  id: "kc-block",
                  title: "2608-12 Тындик",
                  linkedOrderId: "ord-тындик",
                  assignees: [],
                  participants: [],
                  blocked: false,
                  blockReason: "",
                  urgent: false,
                } as KanbanCard,
              ],
            },
          ],
        },
      ],
    } as unknown as KanbanAppState;

    const { changed, state: next } = applyKaitenRefreshPatchesToState(state, [
      {
        cardId: "kaiten-order-ord-тындик",
        linkedOrderId: "ord-тындик",
        kaitenCardId: 68058215,
        assignees: [],
        participants: [],
        fingerprint: "fp-b",
        unmappedLabels: [],
        kaitenHead: { blocked: true, block_reason: "ждём КТ Тындик" },
      },
    ]);
    expect(changed).toBeGreaterThan(0);
    const card = next.boards[0]!.columns[0]!.cards[0]!;
    expect(card.blocked).toBe(true);
    expect(card.blockReason).toBe("ждём КТ Тындик");
  });

  it("пустой inbound не снимает уже стоящих людей (кириллица в title)", () => {
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
                  id: "kc-1",
                  title: "2608-312 Растегаев Ю.В.",
                  linkedOrderId: "ord-а",
                  assignees: ["u-юлич"],
                  participants: ["u-саша"],
                  dueDate: "",
                  urgent: false,
                } as KanbanCard,
              ],
            },
          ],
        },
      ],
    } as unknown as KanbanAppState;

    const { changed, state: next } = applyKaitenRefreshPatchesToState(state, [
      {
        cardId: "kaiten-order-ord-а",
        linkedOrderId: "ord-а",
        kaitenCardId: 68058214,
        assignees: [],
        participants: [],
        fingerprint: "fp-empty",
        unmappedLabels: ["Kaiten user"],
        kaitenHead: null,
      },
    ]);
    expect(changed).toBe(0);
    const card = next.boards[0]!.columns[0]!.cards[0]!;
    expect(card.assignees).toEqual(["u-юлич"]);
    expect(card.participants).toEqual(["u-саша"]);
  });

  it("кнопка Обновить ставит карточку в колонку Kaiten (кириллица)", () => {
    const state = {
      activeBoardId: "odon",
      boards: [
        {
          id: "odon",
          title: "Ортодонтия",
          columns: [
            {
              id: "col-todo",
              title: "К исполнению",
              cards: [
                {
                  id: "kc-1",
                  title: "2608-191 Жеребцов",
                  linkedOrderId: "ord-191",
                  assignees: [],
                  participants: [],
                  dueDate: "",
                  urgent: false,
                } as KanbanCard,
              ],
            },
            { id: "col-agree", title: "Согласование", cards: [] },
          ],
        },
      ],
    } as unknown as KanbanAppState;

    const { changed, state: next } = applyKaitenRefreshPatchesToState(state, [
      {
        cardId: "kc-1",
        linkedOrderId: "ord-191",
        kaitenCardId: 1,
        assignees: [],
        participants: [],
        fingerprint: "fp",
        unmappedLabels: [],
        kaitenHead: null,
        columnTitle: "Согласование",
      },
    ]);
    expect(changed).toBeGreaterThan(0);
    expect(next.boards[0]!.columns[0]!.cards).toHaveLength(0);
    expect(next.boards[0]!.columns[1]!.cards[0]!.linkedOrderId).toBe("ord-191");
  });
});
