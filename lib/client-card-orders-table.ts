import type { DemoKanbanColumn } from "@prisma/client";
import { demoKanbanColumnRu } from "@/lib/kanban-tenant-state-snippet-for-order";
import {
  LAB_WORK_STATUS_LABELS,
  normalizeLegacyLabWorkStatus,
  type LabWorkStatus,
} from "@/lib/lab-work-status";
import { formatMoscowDate } from "@/lib/moscow-datetime-format";
import type { ClientCardOrderItem } from "@/lib/client-card-order-search";

export type ClientCardOrderRow = {
  labWorkStatus: string;
  demoKanbanColumn: string | null;
  adminShippedOtpr: boolean;
  adminShippedAt: Date | null;
};

/** Подпись этапа из полей наряда в БД (без синхронизации Kaiten). */
export function clientCardOrderStageLabel(o: ClientCardOrderRow): string {
  const demo = demoKanbanColumnRu(o.demoKanbanColumn as DemoKanbanColumn | null);
  if (demo) return demo;
  const s = normalizeLegacyLabWorkStatus(o.labWorkStatus);
  return LAB_WORK_STATUS_LABELS[s as LabWorkStatus];
}

export function formatClientCardShippedAt(o: {
  adminShippedOtpr: boolean;
  adminShippedAt: Date | null;
}): string {
  if (!o.adminShippedOtpr) return "—";
  if (o.adminShippedAt) return formatMoscowDate(o.adminShippedAt);
  return "—";
}

const createdAtLabel = (d: Date) =>
  d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function urgentLabel(o: {
  isUrgent: boolean;
  urgentCoefficient: number | null;
}): string {
  if (!o.isUrgent) return "—";
  if (o.urgentCoefficient != null) return `×${o.urgentCoefficient}`;
  return "Срочно";
}

/** Сериализация наряда для ClientCardOrdersTable (клиентский поиск). */
export function toClientCardOrderItem(o: {
  id: string;
  orderNumber: string;
  patientName: string | null;
  doctor?: { fullName: string } | null;
  clinic?: { id: string; name: string } | null;
  labWorkStatus: string;
  demoKanbanColumn: string | null;
  adminShippedOtpr: boolean;
  adminShippedAt: Date | null;
  isUrgent: boolean;
  urgentCoefficient: number | null;
  createdAt: Date;
}): ClientCardOrderItem {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    patientName: o.patientName,
    doctorName: o.doctor?.fullName ?? null,
    clinicId: o.clinic?.id ?? null,
    clinicName: o.clinic?.name ?? null,
    stageLabel: clientCardOrderStageLabel(o),
    urgentLabel: urgentLabel(o),
    createdAtLabel: createdAtLabel(o.createdAt),
    shippedAtLabel: formatClientCardShippedAt(o),
  };
}
