import { describe, expect, it } from "vitest";
import type { KaitenLinkedOrderForKanban } from "@/lib/kanban/kaiten-linked-order";
import {
  defaultAppState,
  mergeKaitenLinkedOrdersIntoAppState,
} from "@/lib/kanban/model";
import { findCardByLinkedOrderId } from "@/lib/kanban/chat-sync";

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
});
