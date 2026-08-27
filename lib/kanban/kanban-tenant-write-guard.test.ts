import { describe, expect, it } from "vitest";
import { defaultAppState, mergeKaitenLinkedOrdersIntoAppState } from "@/lib/kanban/model";
import { shouldSkipSparseKanbanTenantWrite } from "./kanban-tenant-write-guard";

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
});
