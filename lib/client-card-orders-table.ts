import { kaitenStatusDisplay } from "@/lib/kaiten-column-title";
import {
  LAB_WORK_STATUS_LABELS,
  normalizeLegacyLabWorkStatus,
  type LabWorkStatus,
} from "@/lib/lab-work-status";
import { formatMoscowDate } from "@/lib/moscow-datetime-format";

export type ClientCardOrderRow = {
  labWorkStatus: string;
  kaitenColumnTitle: string | null;
  kaitenCardId: number | null;
  demoKanbanColumn: string | null;
  kaitenCardType?: { name: string } | null;
  adminShippedOtpr: boolean;
};

/** Подпись этапа: колонка Kaiten / демо-канбан, иначе labWorkStatus. */
export function clientCardOrderStageLabel(o: ClientCardOrderRow): string {
  const kaiten = kaitenStatusDisplay({
    kaitenColumnTitle: o.kaitenColumnTitle,
    kaitenCardId: o.kaitenCardId,
    demoKanbanColumn: o.demoKanbanColumn,
    demoCardTypeName: o.kaitenCardType?.name ?? null,
  });
  if (kaiten !== "Нет в Kaiten" && kaiten !== "—") {
    return kaiten;
  }
  const s = normalizeLegacyLabWorkStatus(o.labWorkStatus);
  return LAB_WORK_STATUS_LABELS[s as LabWorkStatus];
}

export function formatClientCardShippedAt(
  adminShippedOtpr: boolean,
  sentAt: Date | null | undefined,
): string {
  if (!adminShippedOtpr) return "—";
  if (sentAt) return formatMoscowDate(sentAt);
  return "—";
}
