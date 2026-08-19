import { describe, expect, it } from "vitest";
import type { KaitenLinkedOrderForKanban } from "@/lib/kanban/kaiten-linked-order";
import {
  defaultAppState,
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
  mergeKaitenLinkedOrdersIntoAppState,
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
});
