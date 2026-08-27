import { describe, expect, it } from "vitest";
import { defaultAppState, mergeKaitenLinkedOrdersIntoAppState } from "@/lib/kanban/model";
import {
  kanbanMembersLookStarved,
  kanbanMembersNeedHydration,
  shouldSkipSparseKanbanTenantWrite,
} from "./kanban-tenant-write-guard";

describe("shouldSkipSparseKanbanTenantWrite", () => {
  it("не даёт пустому default затереть доску с нарядами, кириллица в id", () => {
    const stored = mergeKaitenLinkedOrdersIntoAppState(
      defaultAppState(),
      [
        {
          id: "наряд-1",
          orderNumber: "2608-363",
          patientName: "Заитова",
          doctorFullName: "Гронский",
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
          kaitenCardId: 1,
          kaitenColumnTitle: "К исполнению",
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
        },
      ],
      { mode: "upsertOnly" },
    );
    expect(shouldSkipSparseKanbanTenantWrite(defaultAppState(), stored)).toBe(true);
    expect(shouldSkipSparseKanbanTenantWrite(stored, stored)).toBe(false);
  });

  it("не даёт снимку без участников затереть доску, где люди уже стоят", () => {
    const stored = defaultAppState();
    const incoming = defaultAppState();
    for (let i = 0; i < 5; i += 1) {
      stored.boards[0]!.columns[0]!.cards.push({
        id: `k-${i}`,
        title: `наряд ${i} от 10.02.2026`,
        assignees: i === 0 ? ["u-юлич"] : ["u-саша"],
        participants: [],
        linkedOrderId: `наряд-${i}`,
      } as never);
      incoming.boards[0]!.columns[0]!.cards.push({
        id: `k-${i}`,
        title: `наряд ${i} от 10.02.2026`,
        assignees: [],
        participants: [],
        linkedOrderId: `наряд-${i}`,
      } as never);
    }
    expect(shouldSkipSparseKanbanTenantWrite(incoming, stored)).toBe(true);
    expect(shouldSkipSparseKanbanTenantWrite(stored, stored)).toBe(false);
  });

  it("не даёт затереть даже две карточки с людьми", () => {
    const stored = defaultAppState();
    const incoming = defaultAppState();
    for (const i of [0, 1]) {
      stored.boards[0]!.columns[0]!.cards.push({
        id: `k-${i}`,
        title: `наряд ${i} от 10.02.2026`,
        assignees: ["u-юлич"],
        participants: [],
        linkedOrderId: `наряд-${i}`,
      } as never);
      incoming.boards[0]!.columns[0]!.cards.push({
        id: `k-${i}`,
        title: `наряд ${i} от 10.02.2026`,
        assignees: [],
        participants: [],
        linkedOrderId: `наряд-${i}`,
      } as never);
    }
    expect(shouldSkipSparseKanbanTenantWrite(incoming, stored)).toBe(true);
  });

  it("считает доску голодной по людям, если нарядов много, а аватаров почти нет", () => {
    const starved = defaultAppState();
    for (let i = 0; i < 10; i += 1) {
      starved.boards[0]!.columns[0]!.cards.push({
        id: `k-${i}`,
        title: `наряд ${i} от 10.02.2026`,
        assignees: i === 0 ? ["u-саша"] : [],
        participants: [],
        linkedOrderId: `наряд-${i}`,
      } as never);
    }
    expect(kanbanMembersLookStarved(starved)).toBe(true);
    starved.boards[0]!.columns[0]!.cards.forEach((c, i) => {
      if (i > 0) c.assignees = ["u-юлич"];
    });
    expect(kanbanMembersLookStarved(starved)).toBe(false);
    expect(kanbanMembersNeedHydration(starved)).toBe(false);
    starved.boards[0]!.columns[0]!.cards[3]!.assignees = [];
    expect(kanbanMembersLookStarved(starved)).toBe(false);
    expect(kanbanMembersNeedHydration(starved)).toBe(true);
  });

  it("не блокирует PUT, если людей стало не меньше (heal Степанов)", () => {
    const stored = defaultAppState();
    const incoming = defaultAppState();
    for (let i = 0; i < 8; i += 1) {
      stored.boards[0]!.columns[0]!.cards.push({
        id: `k-${i}`,
        title: `наряд ${i} Степанов от 10.02.2026`,
        assignees: i < 6 ? ["u-всеволод"] : [],
        participants: [],
        linkedOrderId: `наряд-${i}`,
      } as never);
      incoming.boards[0]!.columns[0]!.cards.push({
        id: `k-${i}`,
        title: `наряд ${i} Степанов от 10.02.2026`,
        assignees: ["u-всеволод"],
        participants: [],
        linkedOrderId: `наряд-${i}`,
      } as never);
    }
    expect(shouldSkipSparseKanbanTenantWrite(incoming, stored)).toBe(false);
  });
});
