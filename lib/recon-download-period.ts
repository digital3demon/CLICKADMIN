/**
 * Ручной период сверки на карточке: пустые поля = слот карточки;
 * обе даты YYYY-MM-DD — выгрузка этого окна (в т.ч. прошлый период).
 */
import type { ReconciliationSnapshotSlot } from "@prisma/client";
import { slotForYmdRange } from "@/lib/reconciliation-calendar-period";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export type ReconDownloadPeriodDraft = {
  from: string;
  to: string;
};

export type ReconDownloadPeriodOk = {
  ok: true;
  from: string;
  to: string;
  slot: ReconciliationSnapshotSlot;
  manual: boolean;
};

export type ReconDownloadPeriodErr = {
  ok: false;
  error: string;
};

export function resolveReconDownloadPeriod(
  row: {
    periodFromStr: string;
    periodToStr: string;
    slot: ReconciliationSnapshotSlot | string;
  },
  draft: ReconDownloadPeriodDraft,
): ReconDownloadPeriodOk | ReconDownloadPeriodErr {
  const fromDraft = String(draft.from || "").trim();
  const toDraft = String(draft.to || "").trim();
  if (!fromDraft && !toDraft) {
    return {
      ok: true,
      from: row.periodFromStr,
      to: row.periodToStr,
      slot: row.slot as ReconciliationSnapshotSlot,
      manual: false,
    };
  }
  if (!fromDraft || !toDraft) {
    return { ok: false, error: "Укажите обе даты «с» и «по»" };
  }
  if (!YMD.test(fromDraft) || !YMD.test(toDraft)) {
    return { ok: false, error: "Даты периода в формате ГГГГ-ММ-ДД" };
  }
  if (fromDraft > toDraft) {
    return { ok: false, error: "Дата «с» не позже даты «по»" };
  }
  return {
    ok: true,
    from: fromDraft,
    to: toDraft,
    slot: slotForYmdRange(fromDraft, toDraft),
    manual: true,
  };
}
