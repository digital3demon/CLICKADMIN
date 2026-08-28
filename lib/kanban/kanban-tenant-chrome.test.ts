import { describe, expect, it } from "vitest";
import { createCard, defaultAppState } from "@/lib/kanban/model";
import {
  countLinkedCardsInKanbanState,
  stripLinkedOrderCardsForTenantChrome,
} from "@/lib/kanban/kanban-tenant-chrome";

describe("stripLinkedOrderCardsForTenantChrome", () => {
  it("оставляет локальную карточку и выкидывает наряд", () => {
    const state = defaultAppState();
    const col = state.boards[0]!.columns[0]!;
    col.cards.push(
      createCard({ id: "local", title: "Заметка", assignees: [] }),
      createCard({
        id: "linked",
        title: "2608-001 Иванов",
        linkedOrderId: "ord-1",
        assignees: ["u-я"],
      }),
    );
    expect(countLinkedCardsInKanbanState(state)).toBe(1);
    const chrome = stripLinkedOrderCardsForTenantChrome(state);
    const ids = chrome.boards[0]!.columns[0]!.cards.map((c) => c.id);
    expect(ids).toContain("local");
    expect(ids).not.toContain("linked");
    expect(countLinkedCardsInKanbanState(chrome)).toBe(0);
  });

  it("не выкидывает СТОП и архив с нарядом", () => {
    const state = defaultAppState();
    const board = state.boards[0]!;
    const linked = createCard({
      id: "linked-stop",
      title: "2608-002 Петров",
      linkedOrderId: "ord-stop",
    });
    board.stoppedCards = [
      {
        id: "s1",
        stoppedAt: "2026-08-28T10:00:00.000Z",
        sourceColumnId: board.columns[0]!.id,
        sourceColumnTitle: board.columns[0]!.title,
        card: linked,
      },
    ];
    board.archivedCards = [
      {
        id: "a1",
        archivedAt: "2026-08-28T10:00:00.000Z",
        deleteAfterAt: "2026-09-28T10:00:00.000Z",
        sourceColumnId: board.columns[0]!.id,
        sourceColumnTitle: board.columns[0]!.title,
        reason: "manual",
        card: createCard({
          id: "linked-arch",
          title: "2608-003",
          linkedOrderId: "ord-arch",
        }),
      },
    ];
    const chrome = stripLinkedOrderCardsForTenantChrome(state);
    expect(chrome.boards[0]!.stoppedCards?.[0]?.card.linkedOrderId).toBe("ord-stop");
    expect(chrome.boards[0]!.archivedCards?.[0]?.card.linkedOrderId).toBe("ord-arch");
  });
});
