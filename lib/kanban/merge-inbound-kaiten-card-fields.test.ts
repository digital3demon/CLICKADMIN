import { describe, expect, it } from "vitest";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";
import { mergeInboundKaitenMirrorFieldsFromStored } from "@/lib/kanban/merge-inbound-kaiten-card-fields";

function stateWithCard(card: Partial<KanbanCard> & { linkedOrderId: string }): KanbanAppState {
  return {
    boards: [
      {
        id: "b",
        title: "Ортопедия",
        columns: [
          {
            id: "c",
            title: "К исполнению",
            cards: [
              {
                id: "card1",
                title: "наряд 2608-001 срок от 10.02.2026",
                assignees: [],
                participants: [],
                dueDate: "",
                stageDueDate: "",
                urgent: false,
                updatedAt: "2026-08-01T10:00:00.000Z",
                ...card,
              } as KanbanCard,
            ],
          },
        ],
      },
    ],
  } as KanbanAppState;
}

describe("mergeInboundKaitenMirrorFieldsFromStored", () => {
  it("подтягивает ответственных с cron, кириллица в заголовке не мешает", () => {
    const incoming = stateWithCard({
      linkedOrderId: "ord1",
      assignees: ["old"],
      kaitenMembersFingerprint: "1:2",
    });
    const stored = stateWithCard({
      linkedOrderId: "ord1",
      assignees: ["new-user"],
      kaitenMembersFingerprint: "9:2",
      updatedAt: "2026-08-21T12:00:00.000Z",
    });
    expect(mergeInboundKaitenMirrorFieldsFromStored(incoming, stored)).toBe(true);
    expect(incoming.boards[0]!.columns[0]!.cards[0]!.assignees).toEqual(["new-user"]);
  });

  it("не откатывает состав, который клиент только что запушил в Kaiten", () => {
    const incoming = stateWithCard({
      linkedOrderId: "ord1",
      assignees: ["local"],
      kaitenMembersFingerprint: "1:2",
      lastPushedMembersFingerprint: "9:2",
    });
    const stored = stateWithCard({
      linkedOrderId: "ord1",
      assignees: ["from-cron"],
      kaitenMembersFingerprint: "9:2",
    });
    expect(mergeInboundKaitenMirrorFieldsFromStored(incoming, stored)).toBe(false);
    expect(incoming.boards[0]!.columns[0]!.cards[0]!.assignees).toEqual(["local"]);
  });

  it("не затирает локальных людей пустым cron", () => {
    const incoming = stateWithCard({
      linkedOrderId: "ord1",
      assignees: ["local"],
      kaitenMembersFingerprint: "1:2",
    });
    const stored = stateWithCard({
      linkedOrderId: "ord1",
      assignees: [],
      participants: [],
      kaitenMembersFingerprint: "empty",
      updatedAt: "2026-08-21T12:00:00.000Z",
    });
    expect(mergeInboundKaitenMirrorFieldsFromStored(incoming, stored)).toBe(false);
    expect(incoming.boards[0]!.columns[0]!.cards[0]!.assignees).toEqual(["local"]);
  });

  it("берёт более свежий срок этапа со stored", () => {
    const incoming = stateWithCard({
      linkedOrderId: "ord1",
      stageDueDate: "2026-08-01",
      updatedAt: "2026-08-01T10:00:00.000Z",
    });
    const stored = stateWithCard({
      linkedOrderId: "ord1",
      stageDueDate: "2026-08-20",
      updatedAt: "2026-08-21T12:00:00.000Z",
    });
    expect(mergeInboundKaitenMirrorFieldsFromStored(incoming, stored)).toBe(true);
    expect(incoming.boards[0]!.columns[0]!.cards[0]!.stageDueDate).toBe("2026-08-20");
  });

  it("возвращает участников со stored, если incoming после F5 пустой", () => {
    const incoming = stateWithCard({
      linkedOrderId: "ord1",
      title: "наряд кириллица от 10.02.2026",
      assignees: [],
      participants: [],
    });
    const stored = stateWithCard({
      linkedOrderId: "ord1",
      assignees: [],
      participants: ["u-саша"],
    });
    expect(mergeInboundKaitenMirrorFieldsFromStored(incoming, stored)).toBe(
      true,
    );
    expect(incoming.boards[0]!.columns[0]!.cards[0]!.participants).toEqual([
      "u-саша",
    ]);
  });

  it("не снимает локальный срок пустым более свежим stored", () => {
    const incoming = stateWithCard({
      linkedOrderId: "ord1",
      stageDueDate: "2026-08-01",
      updatedAt: "2026-08-01T10:00:00.000Z",
    });
    const stored = stateWithCard({
      linkedOrderId: "ord1",
      stageDueDate: "",
      updatedAt: "2026-08-21T12:00:00.000Z",
    });
    mergeInboundKaitenMirrorFieldsFromStored(incoming, stored);
    expect(incoming.boards[0]!.columns[0]!.cards[0]!.stageDueDate).toBe("2026-08-01");
  });
});
