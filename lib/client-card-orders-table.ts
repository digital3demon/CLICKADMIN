import type { DemoKanbanColumn } from "@prisma/client";
import { demoKanbanColumnRu } from "@/lib/kanban-tenant-state-snippet-for-order";
import {
  LAB_WORK_STATUS_LABELS,
  normalizeLegacyLabWorkStatus,
  type LabWorkStatus,
} from "@/lib/lab-work-status";
import { formatMoscowDate } from "@/lib/moscow-datetime-format";

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
