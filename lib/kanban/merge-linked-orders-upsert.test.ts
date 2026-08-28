import { describe, expect, it } from "vitest";
import type { KaitenLinkedOrderForKanban } from "@/lib/kanban/kaiten-linked-order";
import {
  buildKanbanDisplayView,
  defaultAppState,
  demoKanbanDefaultState,
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
  KANBAN_BOARD_PRODUCTION_ID,
  mergeKaitenLinkedOrdersIntoAppState,
  normalizeDemoKanbanAppState,
  removeLinkedOrderCardsFromAppState,
} from "@/lib/kanban/model";
import { findCardByLinkedOrderId } from "@/lib/kanban/chat-sync";
import { getKanbanStageDue, setKanbanStageDue } from "@/lib/kanban/kanban-stage-due";

function sampleRow(
  id: string,
  overrides?: Partial<KaitenLinkedOrderForKanban>,
): KaitenLinkedOrderForKanban {
  return {
    id,
    orderNumber: `N-${id}`,
    patientName: "Пациент",
    doctorFullName: "Врач",
    dueDate: null,
    appointmentDate: null,
    dueToAdminsAt: null,
    kaitenAdminDueHasTime: true,
    kaitenCardTitleLabel: null,
    kaitenCardTypeId: null,
    kaitenCardTypeName: null,
    kaitenTrackLane: "ORTHOPEDICS",
    isUrgent: false,
    urgentCoefficient: null,
    kaitenCardId: null,
    kaitenColumnTitle: null,
    kaitenCardSortOrder: null,
    kaitenCardTitleMirror: null,
    kaitenCardDescriptionMirror: null,
    kaitenBlocked: false,
    kaitenBlockReason: null,
    kaitenBlockedAt: null,
    demoKanbanColumn: null,
    primaryPriceListItemName: null,
    clientOrderText: null,
    notes: null,
    ...overrides,
  };
}

describe("mergeKaitenLinkedOrdersIntoAppState upsertOnly", () => {
  it("does not remove other linked cards when upserting one row", () => {
    const base = defaultAppState();
    const withTwo = mergeKaitenLinkedOrdersIntoAppState(
      base,
      [sampleRow("order-a"), sampleRow("order-b")],
      { mode: "upsertOnly" },
    );
    expect(findCardByLinkedOrderId(withTwo, "order-a")).not.toBeNull();
    expect(findCardByLinkedOrderId(withTwo, "order-b")).not.toBeNull();

    const afterOne = mergeKaitenLinkedOrdersIntoAppState(
      withTwo,
      [sampleRow("order-a", { patientName: "Обновлён" })],
      { mode: "upsertOnly" },
    );
    expect(findCardByLinkedOrderId(afterOne, "order-a")).not.toBeNull();
    expect(findCardByLinkedOrderId(afterOne, "order-b")).not.toBeNull();
    const locA = findCardByLinkedOrderId(afterOne, "order-a")!;
    const cardA =
      afterOne.boards[locA.boardIndex]!.columns[locA.columnIndex]!.cards[
        locA.cardIndex
      ]!;
    expect(cardA.title).toContain("Обновлён");
  });

  it("replaceEligible still prunes missing linked cards", () => {
    const base = defaultAppState();
    const withTwo = mergeKaitenLinkedOrdersIntoAppState(
      base,
      [sampleRow("order-a"), sampleRow("order-b")],
      { mode: "upsertOnly" },
    );
    const replaced = mergeKaitenLinkedOrdersIntoAppState(
      withTwo,
      [sampleRow("order-a")],
      { mode: "replaceEligible" },
    );
    expect(findCardByLinkedOrderId(replaced, "order-a")).not.toBeNull();
    expect(findCardByLinkedOrderId(replaced, "order-b")).toBeNull();
  });

  it("moves card to orthodontics when order kaitenTrackLane changes", () => {
    const base = defaultAppState();
    const onOrtho = mergeKaitenLinkedOrdersIntoAppState(
      base,
      [sampleRow("order-a", { kaitenTrackLane: "ORTHOPEDICS", kaitenCardId: 1 })],
      { mode: "upsertOnly" },
    );
    const loc1 = findCardByLinkedOrderId(onOrtho, "order-a")!;
    expect(onOrtho.boards[loc1.boardIndex]!.id).toBe(KANBAN_BOARD_ORTHOPEDICS_ID);

    const onOdon = mergeKaitenLinkedOrdersIntoAppState(
      onOrtho,
      [sampleRow("order-a", { kaitenTrackLane: "ORTHODONTICS", kaitenCardId: 1 })],
      { mode: "upsertOnly" },
    );
    const loc2 = findCardByLinkedOrderId(onOdon, "order-a")!;
    expect(onOdon.boards[loc2.boardIndex]!.id).toBe(KANBAN_BOARD_ORTHODONTICS_ID);
    const moved =
      onOdon.boards[loc2.boardIndex]!.columns[loc2.columnIndex]!.cards[
        loc2.cardIndex
      ]!;
    expect(moved.trackLane).toBe("ORTHODONTICS");
  });

  it("лаб-срок и дата записи не становятся сроком карточки", () => {
    const merged = mergeKaitenLinkedOrdersIntoAppState(
      defaultAppState(),
      [
        sampleRow("order-a", {
          dueDate: "2026-08-01T09:00:00.000Z",
          appointmentDate: "2026-08-10T10:00:00.000Z",
        }),
      ],
      { mode: "upsertOnly" },
    );
    const loc = findCardByLinkedOrderId(merged, "order-a")!;
    const card =
      merged.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[
        loc.cardIndex
      ]!;
    expect(getKanbanStageDue(card)).toBe("");
    setKanbanStageDue(card, "2026-09-15");
    const again = mergeKaitenLinkedOrdersIntoAppState(
      merged,
      [
        sampleRow("order-a", {
          dueDate: "2026-08-01T09:00:00.000Z",
          appointmentDate: "2026-08-10T10:00:00.000Z",
          patientName: "Пациент кириллица",
        }),
      ],
      { mode: "upsertOnly" },
    );
    const loc2 = findCardByLinkedOrderId(again, "order-a")!;
    const card2 =
      again.boards[loc2.boardIndex]!.columns[loc2.columnIndex]!.cards[
        loc2.cardIndex
      ]!;
    expect(getKanbanStageDue(card2)).toBe("2026-09-15");
    expect(card2.title).toContain("01.08");
  });

  it("пишет linkedOrderNumber для поиска 299 без номера в заголовке Kaiten", () => {
    const merged = mergeKaitenLinkedOrdersIntoAppState(
      defaultAppState(),
      [
        sampleRow("order-299", {
          orderNumber: "2607-299",
          patientName: "Степанов А.В.",
          doctorFullName: "Жевлаков А.",
          kaitenTrackLane: "ORTHODONTICS",
        }),
      ],
      { mode: "upsertOnly" },
    );
    const loc = findCardByLinkedOrderId(merged, "order-299")!;
    const card =
      merged.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[
        loc.cardIndex
      ]!;
    expect(card.linkedOrderNumber).toBe("2607-299");
    expect(card.title).toContain("2607-299");
  });
});

describe("demo kanban visual = main CRM", () => {
  it("демо-состояние держит ортопедию, ортодонтию и производство", () => {
    const demo = demoKanbanDefaultState();
    const ids = demo.boards.map((b) => b.id);
    expect(ids).toContain(KANBAN_BOARD_ORTHOPEDICS_ID);
    expect(ids).toContain(KANBAN_BOARD_ORTHODONTICS_ID);
    expect(ids).toContain(KANBAN_BOARD_PRODUCTION_ID);
    expect(demo.boards.some((b) => b.title === "Работы")).toBe(false);
  });

  it("демо-merge кладёт наряд на ортодонтию по lane", () => {
    const merged = mergeKaitenLinkedOrdersIntoAppState(
      normalizeDemoKanbanAppState(defaultAppState()),
      [
        sampleRow("order-odon", {
          kaitenTrackLane: "ORTHODONTICS",
          kaitenColumnTitle: "К исполнению",
        }),
      ],
      { demo: true, mode: "upsertOnly" },
    );
    const loc = findCardByLinkedOrderId(merged, "order-odon")!;
    expect(merged.boards[loc.boardIndex]!.id).toBe(KANBAN_BOARD_ORTHODONTICS_ID);
    expect(
      merged.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!
        .trackLane,
    ).toBe("ORTHODONTICS");
  });
});

describe("mergeKaitenLinkedOrders members survive recreate", () => {
  it("не теряет участников, если карточку собрали заново", () => {
    const base = defaultAppState();
    const withPeople = mergeKaitenLinkedOrdersIntoAppState(
      base,
      [sampleRow("order-a", { kaitenTrackLane: "ORTHOPEDICS" })],
      { mode: "upsertOnly" },
    );
    const loc = findCardByLinkedOrderId(withPeople, "order-a")!;
    const card =
      withPeople.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[
        loc.cardIndex
      ]!;
    card.participants = ["u-саша"];
    card.assignees = [];
    card.id = "other-card-id";

    const again = mergeKaitenLinkedOrdersIntoAppState(
      withPeople,
      [
        sampleRow("order-a", {
          kaitenTrackLane: "ORTHOPEDICS",
          kaitenColumnTitle: "К исполнению",
        }),
      ],
      { mode: "upsertOnly" },
    );
    const loc2 = findCardByLinkedOrderId(again, "order-a")!;
    const card2 =
      again.boards[loc2.boardIndex]!.columns[loc2.columnIndex]!.cards[
        loc2.cardIndex
      ]!;
    expect(card2.participants).toEqual(["u-саша"]);
  });
});

describe("removeLinkedOrderCardsFromAppState", () => {
  it("снимает карточку удалённого наряда", () => {
    const withTwo = mergeKaitenLinkedOrdersIntoAppState(
      defaultAppState(),
      [sampleRow("order-a"), sampleRow("order-b")],
      { mode: "upsertOnly" },
    );
    const pruned = removeLinkedOrderCardsFromAppState(withTwo, ["order-b"]);
    expect(findCardByLinkedOrderId(pruned, "order-a")).not.toBeNull();
    expect(findCardByLinkedOrderId(pruned, "order-b")).toBeNull();
  });

  it("columnsOnly не снимает карточку из СТОП (goneIds батча)", () => {
    const withTwo = mergeKaitenLinkedOrdersIntoAppState(
      defaultAppState(),
      [sampleRow("order-a"), sampleRow("наряд-стоп")],
      { mode: "upsertOnly" },
    );
    const board = withTwo.boards[0]!;
    const card = board.columns.flatMap((c) => c.cards).find((c) => c.linkedOrderId === "наряд-стоп")!;
    board.stoppedCards = [
      {
        id: "stop-1",
        stoppedAt: "2026-08-27T10:00:00.000Z",
        sourceColumnId: board.columns[0]!.id,
        sourceColumnTitle: board.columns[0]!.title,
        card,
      },
    ];
    board.columns.forEach((c) => {
      c.cards = c.cards.filter((x) => x.linkedOrderId !== "наряд-стоп");
    });
    const pruned = removeLinkedOrderCardsFromAppState(withTwo, ["наряд-стоп"], {
      columnsOnly: true,
    });
    expect(pruned.boards[0]!.stoppedCards?.some((r) => r.card.linkedOrderId === "наряд-стоп")).toBe(
      true,
    );
  });

  it("дорожка из БД кладёт карточку на ортодонтию на пустую доску — без поиска", () => {
    const next = mergeKaitenLinkedOrdersIntoAppState(
      defaultAppState(),
      [
        sampleRow("2607-299", {
          kaitenTrackLane: "ORTHODONTICS",
          orderNumber: "2607-299",
          patientName: "Степанов А.В.",
        }),
      ],
      { mode: "upsertOnly" },
    );
    const loc = findCardByLinkedOrderId(next, "2607-299");
    expect(loc).not.toBeNull();
    expect(next.boards[loc!.boardIndex]!.id).toBe(KANBAN_BOARD_ORTHODONTICS_ID);
    const { displayBoard } = buildKanbanDisplayView(
      { ...next, activeBoardId: KANBAN_BOARD_ORTHODONTICS_ID, search: "" },
      { sessionUserId: "me", sessionUserRole: "ADMIN" },
    );
    const titles = displayBoard.columns.flatMap((c) => c.cards.map((x) => x.title));
    expect(titles.some((t) => t.includes("2607-299"))).toBe(true);
  });

  it("пустой kaitenTrackLane не переносит карточку с ортодонтии на ортопедию", () => {
    const onOdon = mergeKaitenLinkedOrdersIntoAppState(
      defaultAppState(),
      [sampleRow("наряд-дорожка", { kaitenTrackLane: "ORTHODONTICS", kaitenCardId: 7 })],
      { mode: "upsertOnly" },
    );
    const kept = mergeKaitenLinkedOrdersIntoAppState(
      onOdon,
      [sampleRow("наряд-дорожка", { kaitenTrackLane: null, kaitenCardId: 7 })],
      { mode: "upsertOnly" },
    );
    const loc = findCardByLinkedOrderId(kept, "наряд-дорожка")!;
    expect(kept.boards[loc.boardIndex]!.id).toBe(KANBAN_BOARD_ORTHODONTICS_ID);
  });
});
