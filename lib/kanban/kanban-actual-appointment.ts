/**
 * Режим «Актуальное» на доске канбана: те же даты записи, что на /orders?ship=actual
 * (сегодня … сегодня+2 рабочих дня МСК). Сортировка, не скрытие:
 * карточка с датой вне окна остаётся в колонке.
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

/** Текстовый поиск важнее «Актуального»: иначе карточка есть, а «Найдено 0», пока нет слота записи. */
export function kanbanShouldApplyActualAppointmentView(
  actualOn: boolean,
  search: string,
): boolean {
  return actualOn && (search || "").trim().length < 2;
}

/**
 * Копия доски: ближайшие записи сверху, остальные карточки остаются.
 * Нельзя выкидывать карточку из колонки — поиск тогда «воскрешает» её.
 */
export function applyKanbanActualAppointmentView(
  board: KanbanBoard,
  byOrderId: ReadonlyMap<string, KanbanLinkedAppointmentSnap>,
  range: { start: Date; endExclusive: Date } = ordersShipmentActualAppointmentRange(),
): KanbanBoard {
  const next = structuredClone(board);
  for (const col of next.columns) {
    const cards = [...col.cards];
    cards.sort((a, b) => {
      const aHit = kanbanCardMatchesActualAppointment(a, byOrderId, range);
      const bHit = kanbanCardMatchesActualAppointment(b, byOrderId, range);
      if (aHit !== bHit) return aHit ? -1 : 1;
      return compareOrdersByEffectiveAppointment(
        appointmentFieldsForCard(a, byOrderId),
        appointmentFieldsForCard(b, byOrderId),
      );
    });
    col.cards = cards;
  }
  return next;
}
