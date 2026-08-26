import { describe, expect, it } from "vitest";
import { applyKaitenRefreshPatchesToState } from "./apply-kaiten-refresh-patches";
import type { KanbanAppState, KanbanCard } from "./types";

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
});
