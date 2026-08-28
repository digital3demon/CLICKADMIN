import { describe, expect, it } from "vitest";
import { defaultAppState } from "@/lib/kanban/model";
import { getKanbanStageDue, setKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import {
  applyKanbanCardHeadsCache,
  collectKanbanCardHeadsCache,
  collectLinkedOrderIdsFromHeadsCache,
  membersForKanbanAggregateKeep,
  mergeKanbanCardHeadsCache,
  mergeStickyLinkedOrderIds,
  prependMissingLinkedOrderIds,
} from "./kanban-card-heads-cache";

describe("kanban card heads cache", () => {
  it("возвращает людей и срок на пустую карточку того же наряда", () => {
    const state = defaultAppState();
    const board = state.boards[0]!;
    const col = board.columns[0]!;
    col.cards.push({
      id: "kaiten-order-oid-1",
      title: "2608-363 Гронский Л. Заитова",
      assignees: ["u-саша"],
      participants: [],
      stageDueDate: "2026-09-08",
      dueDate: "",
      linkedOrderId: "oid-1",
    } as never);
    const heads = collectKanbanCardHeadsCache(state);
    expect(heads["oid:oid-1"]?.assignees).toEqual(["u-саша"]);
    expect(heads["oid:oid-1"]?.stageDue).toBe("2026-09-08");

    const empty = defaultAppState();
    empty.boards[0]!.columns[0]!.cards.push({
      id: "kaiten-order-oid-1",
      title: "2608-363 Гронский Л. Заитова",
      assignees: [],
      participants: [],
      stageDueDate: "",
      dueDate: "",
      linkedOrderId: "oid-1",
    } as never);
    expect(applyKanbanCardHeadsCache(empty, heads)).toBe(true);
    const card = empty.boards[0]!.columns[0]!.cards[0]!;
    expect(card.assignees).toEqual(["u-саша"]);
    expect(getKanbanStageDue(card)).toBe("2026-09-08");
    setKanbanStageDue(card, "2026-09-08");
  });

  it("не выкидывает людей с других карточек, если входящий снимок почти пустой", () => {
    const existing = {
      "oid:наряд-юля": {
        assignees: ["u-саша"],
        participants: ["u-юлич"],
        fingerprint: "fp-юля",
        stageDue: "2026-08-26",
      },
    };
    const incoming = collectKanbanCardHeadsCache(
      (() => {
        const state = defaultAppState();
        state.boards[0]!.columns[0]!.cards.push({
          id: "k-other",
          title: "2608-364 Растегаев",
          assignees: [],
          participants: [],
          stageDueDate: "2026-09-01",
          dueDate: "",
          linkedOrderId: "oid-other",
        } as never);
        return state;
      })(),
    );
    const merged = mergeKanbanCardHeadsCache(existing, incoming);
    expect(merged["oid:наряд-юля"]?.assignees).toEqual(["u-саша"]);
    expect(merged["oid:наряд-юля"]?.participants).toEqual(["u-юлич"]);
    expect(merged["oid:наряд-юля"]?.stageDue).toBe("2026-08-26");
    expect(merged["oid:oid-other"]?.stageDue).toBe("2026-09-01");
  });

  it("для «МОИ» отдаёт наряды, где пользователь в участниках (кириллица вокруг id)", () => {
    const heads = {
      "oid:ord-степанов": {
        assignees: [],
        participants: ["u-всеволод", "u-арина"],
        fingerprint: null,
        stageDue: "",
      },
      "oid:ord-чужой": {
        assignees: ["u-олег"],
        participants: [],
        fingerprint: null,
        stageDue: "",
      },
    };
    expect(
      collectLinkedOrderIdsFromHeadsCache(heads, { sessionUserId: "u-всеволод" }),
    ).toEqual(["ord-степанов"]);
    expect(collectLinkedOrderIdsFromHeadsCache(heads)).toEqual([
      "ord-степанов",
      "ord-чужой",
    ]);
    expect(
      prependMissingLinkedOrderIds(["ord-на-доске"], ["ord-степанов", "ord-на-доске"]),
    ).toEqual(["ord-степанов", "ord-на-доске"]);
  });

  it("для фильтра «МОИ» склеивает людей карточки с кэшем (кириллица вокруг id)", () => {
    const heads = {
      "oid:ord-степанов": {
        assignees: [],
        participants: ["u-всеволод"],
        fingerprint: null,
        stageDue: "",
      },
    };
    const members = membersForKanbanAggregateKeep(
      {
        id: "карта-степанов",
        linkedOrderId: "ord-степанов",
        assignees: [],
        participants: [],
      },
      heads,
    );
    expect(members.participants).toEqual(["u-всеволод"]);
    expect(members.assignees).toEqual([]);
  });

  it("новые найденные наряды в sticky идут первыми (кириллица в id)", () => {
    expect(mergeStickyLinkedOrderIds(["ord-на-доске"], ["ord-степанов"])).toEqual([
      "ord-степанов",
      "ord-на-доске",
    ]);
  });
});
