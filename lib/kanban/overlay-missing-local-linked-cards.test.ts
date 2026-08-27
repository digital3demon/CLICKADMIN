import { describe, expect, it } from "vitest";
import { createCard, defaultAppState, KANBAN_BOARD_ORTHODONTICS_ID } from "@/lib/kanban/model";
import { overlayMissingLocalLinkedCardsOntoRemote } from "@/lib/kanban/overlay-missing-local-linked-cards";

describe("overlayMissingLocalLinkedCardsOntoRemote", () => {
  it("возвращает карточку Степанова с ортодонтии, если remote её выкинул", () => {
    const local = defaultAppState();
    const ortho = local.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    const prod = ortho.columns.find((c) => c.title === "Производство")!;
    prod.cards.push(
      createCard({
        id: "kaiten-order-степанов",
        title: "2607-299 Степанов А.В. Жевлаков А. ХШ + Нагрузка",
        linkedOrderId: "ord-степанов",
        assignees: [],
        participants: ["u-всеволод", "u-арина"],
      }),
    );

    const remote = defaultAppState();
    expect(
      overlayMissingLocalLinkedCardsOntoRemote(local, remote),
    ).toBe(true);

    const remoteOrtho = remote.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    const remoteProd = remoteOrtho.columns.find((c) => c.title === "Производство")!;
    const titles = remoteProd.cards.map((c) => c.title);
    expect(titles.some((t) => t.includes("Степанов"))).toBe(true);
    expect(remoteProd.cards[0]!.linkedOrderId).toBe("ord-степанов");
    expect(remoteProd.cards[0]!.participants).toEqual(["u-всеволод", "u-арина"]);
  });

  it("не поднимает скрытый наряд и не дублирует уже лежащий", () => {
    const local = defaultAppState();
    const ortho = local.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    const prod = ortho.columns.find((c) => c.title === "Производство")!;
    prod.cards.push(
      createCard({
        id: "kaiten-order-скрыт",
        title: "2607-300 Скрытый",
        linkedOrderId: "ord-скрыт",
      }),
    );
    prod.cards.push(
      createCard({
        id: "kaiten-order-есть",
        title: "2607-301 Уже есть",
        linkedOrderId: "ord-есть",
      }),
    );

    const remote = defaultAppState();
    remote.hiddenLinkedOrderIds = ["ord-скрыт"];
    const remoteOrtho = remote.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    remoteOrtho.columns
      .find((c) => c.title === "Производство")!
      .cards.push(
        createCard({
          id: "kaiten-order-есть",
          title: "2607-301 Уже есть",
          linkedOrderId: "ord-есть",
        }),
      );

    expect(overlayMissingLocalLinkedCardsOntoRemote(local, remote)).toBe(false);
    const remoteProd = remoteOrtho.columns.find((c) => c.title === "Производство")!;
    expect(remoteProd.cards.filter((c) => c.linkedOrderId === "ord-есть")).toHaveLength(1);
    expect(remoteProd.cards.some((c) => c.linkedOrderId === "ord-скрыт")).toBe(false);
  });

  it("возвращает наряд из локального СТОП, если remote его выкинул", () => {
    const local = defaultAppState();
    const ortho = local.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    ortho.stoppedCards = [
      {
        id: "stop-степанов",
        stoppedAt: "2026-08-27T10:00:00.000Z",
        sourceColumnId: "col",
        sourceColumnTitle: "Производство",
        card: createCard({
          id: "kaiten-order-стоп",
          title: "2607-299 Степанов СТОП",
          linkedOrderId: "ord-стоп",
          participants: ["u-всеволод"],
        }),
      },
    ];
    const remote = defaultAppState();
    expect(overlayMissingLocalLinkedCardsOntoRemote(local, remote)).toBe(true);
    const remoteOrtho = remote.boards.find((b) => b.id === KANBAN_BOARD_ORTHODONTICS_ID)!;
    expect(
      (remoteOrtho.stoppedCards || []).some((r) => r.card.linkedOrderId === "ord-стоп"),
    ).toBe(true);
  });
});
