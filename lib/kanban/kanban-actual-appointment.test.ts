import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import {
  applyKanbanActualAppointmentView,
  kanbanShouldApplyActualAppointmentView,
  kanbanCardMatchesActualAppointment,
  linkedOrdersToAppointmentMap,
} from "@/lib/kanban/kanban-actual-appointment";
import { ordersShipmentActualAppointmentRange } from "@/lib/orders-shipment-list-filter";
import type { KaitenLinkedOrderForKanban } from "@/lib/kanban/kaiten-linked-order";

function card(id: string, linkedOrderId?: string): KanbanCard {
  return {
    id,
    title: id,
    description: "",
    cardTypeId: "t",
    assignees: [],
    participants: [],
    dueDate: "",
    urgent: false,
    linkedOrderId,
    createdAt: "",
    updatedAt: "",
    comments: [],
    files: [],
    checklist: [],
    activity: [],
  } as KanbanCard;
}

function row(
  id: string,
  appointmentDate: string | null,
): KaitenLinkedOrderForKanban {
  return {
    id,
    orderNumber: `N-${id}`,
    patientName: null,
    doctorFullName: "Врач",
    dueDate: null,
    appointmentDate,
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
  };
}

describe("kanban actual appointment", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("кириллица в номере не мешает карте нарядов", () => {
    const m = linkedOrdersToAppointmentMap([
      { ...row("o1", "2026-07-28T10:00:00+03:00"), orderNumber: "наряд 2607-001" },
    ]);
    expect(m.get("o1")?.orderNumber).toBe("наряд 2607-001");
  });

  it("без наряда и без снимка — входит в актуальное", () => {
    const range = ordersShipmentActualAppointmentRange("2026-07-27");
    const empty = new Map();
    expect(kanbanCardMatchesActualAppointment(card("local"), empty, range)).toBe(
      true,
    );
    expect(
      kanbanCardMatchesActualAppointment(card("linked", "missing"), empty, range),
    ).toBe(true);
  });

  it("фильтрует и сортирует колонку по дате записи", () => {
    const range = ordersShipmentActualAppointmentRange("2026-07-27");
    const byOrder = linkedOrdersToAppointmentMap([
      row("old", "2026-07-01T10:00:00+03:00"),
      row("in", "2026-07-28T10:00:00+03:00"),
      row("later", "2026-07-28T15:00:00+03:00"),
    ]);
    const board: KanbanBoard = {
      id: "b",
      title: "Ортопедия",
      columns: [
        {
          id: "c1",
          title: "К исполнению",
          cards: [
            card("c-later", "later"),
            card("c-old", "old"),
            card("c-in", "in"),
            card("c-local"),
          ],
        },
      ],
      users: [],
      cardTypes: [],
    };
    const next = applyKanbanActualAppointmentView(board, byOrder, range);
    expect(next.columns[0]!.cards.map((c) => c.id)).toEqual([
      "c-local",
      "c-in",
      "c-later",
    ]);
    expect(board.columns[0]!.cards).toHaveLength(4);
  });
});

describe("kanbanShouldApplyActualAppointmentView", () => {
  it("не режет доску, пока в поиске есть текст", () => {
    expect(kanbanShouldApplyActualAppointmentView(true, "тындик")).toBe(false);
    expect(kanbanShouldApplyActualAppointmentView(true, "  ")).toBe(true);
    expect(kanbanShouldApplyActualAppointmentView(false, "")).toBe(false);
  });
});
