import {
  isLabWorkStatus,
  LAB_WORK_STATUS_LABELS,
  normalizeLegacyLabWorkStatus,
} from "@/lib/lab-work-status";
import { resolveKaitenColumnTitleForDisplay } from "@/lib/order-status-display";

/** Подпись этапа/статуса для печати списка отгрузок. */
export function orderShipmentListStatusLabel(order: {
  kaitenColumnTitle?: string | null;
  demoKanbanColumn?: string | null;
  labWorkStatus: string;
  kaitenBlocked?: boolean | null;
}): string {
  if (order.kaitenBlocked) return "Стоп";
  const col = resolveKaitenColumnTitleForDisplay({
    kaitenColumnTitle: order.kaitenColumnTitle,
    demoKanbanColumn: order.demoKanbanColumn,
  });
  if (col) return col;
  const status = normalizeLegacyLabWorkStatus(String(order.labWorkStatus ?? ""));
  if (isLabWorkStatus(status)) return LAB_WORK_STATUS_LABELS[status];
  const raw = String(order.labWorkStatus ?? "").trim();
  return raw || "—";
}
