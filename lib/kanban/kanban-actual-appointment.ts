/**
 * Режим «Актуальное» на доске канбана: те же даты записи, что на /orders?ship=actual
 * (сегодня … сегодня+2 рабочих дня МСК, плюс карточки без даты).
 * Только активная доска; не пишется в tenant JSON.
 */
import type { KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import type { KaitenLinkedOrderForKanban } from "@/lib/kanban/kaiten-linked-order";
import {
  compareOrdersByEffectiveAppointment,
  orderMatchesShipmentActualAppointment,
  ordersShipmentActualAppointmentRange,
} from "@/lib/orders-shipment-list-filter";

export type KanbanLinkedAppointmentSnap = {
  orderNumber: string;
  appointmentDate: string | null;
  dueToAdminsAt: string | null;
  dueToAdminsHasTime: boolean | null;
};

export function linkedOrdersToAppointmentMap(
  rows: readonly KaitenLinkedOrderForKanban[],
): Map<string, KanbanLinkedAppointmentSnap> {
  const m = new Map<string, KanbanLinkedAppointmentSnap>();
  for (const r of rows) {
    m.set(r.id, {
      orderNumber: r.orderNumber,
      appointmentDate: r.appointmentDate ?? null,
      dueToAdminsAt: r.dueToAdminsAt,
      dueToAdminsHasTime: r.kaitenAdminDueHasTime,
    });
  }
  return m;
}

function parseIsoOrNull(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function appointmentFieldsForCard(
  card: KanbanCard,
  byOrderId: ReadonlyMap<string, KanbanLinkedAppointmentSnap>,
): {
  appointmentDate: Date | null;
  dueToAdminsAt: Date | null;
  dueToAdminsHasTime?: boolean | null;
  orderNumber: string;
  id: string;
} {
  const oid = card.linkedOrderId?.trim() || "";
  const snap = oid ? byOrderId.get(oid) : undefined;
  return {
    appointmentDate: parseIsoOrNull(snap?.appointmentDate),
    dueToAdminsAt: parseIsoOrNull(snap?.dueToAdminsAt),
    dueToAdminsHasTime: snap?.dueToAdminsHasTime,
    orderNumber: snap?.orderNumber || card.title || card.id,
    id: oid || card.id,
  };
}

export function kanbanCardMatchesActualAppointment(
  card: KanbanCard,
  byOrderId: ReadonlyMap<string, KanbanLinkedAppointmentSnap>,
  range: { start: Date; endExclusive: Date } = ordersShipmentActualAppointmentRange(),
): boolean {
  const oid = card.linkedOrderId?.trim() || "";
  if (!oid) return true;
  const snap = byOrderId.get(oid);
  if (!snap) return true;
  return orderMatchesShipmentActualAppointment(
    {
      appointmentDate: parseIsoOrNull(snap.appointmentDate),
      dueToAdminsAt: parseIsoOrNull(snap.dueToAdminsAt),
    },
    range.start,
    range.endExclusive,
  );
}

/** Копия доски: в колонках только «актуальные» карточки, внутри колонки — сортировка как в заказах. */
export function applyKanbanActualAppointmentView(
  board: KanbanBoard,
  byOrderId: ReadonlyMap<string, KanbanLinkedAppointmentSnap>,
  range: { start: Date; endExclusive: Date } = ordersShipmentActualAppointmentRange(),
): KanbanBoard {
  const next = structuredClone(board);
  for (const col of next.columns) {
    const kept = col.cards.filter((c) =>
      kanbanCardMatchesActualAppointment(c, byOrderId, range),
    );
    kept.sort((a, b) =>
      compareOrdersByEffectiveAppointment(
        appointmentFieldsForCard(a, byOrderId),
        appointmentFieldsForCard(b, byOrderId),
      ),
    );
    col.cards = kept;
  }
  return next;
}
