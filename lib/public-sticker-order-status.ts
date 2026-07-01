import { kaitenStatusDisplay } from "@/lib/kaiten-column-title";
import {
  LAB_WORK_STATUS_DEFAULT,
  LAB_WORK_STATUS_LABELS,
  LAB_WORK_STATUS_ORDER,
  LAB_WORK_STATUS_PILL_STYLES,
  normalizeLegacyLabWorkStatus,
  type LabWorkStatus,
} from "@/lib/lab-work-status";
import {
  getKaitenColumnPillClassFromOrder,
  labWorkStatusFromColumnTitle,
} from "@/lib/order-status-display";

export const PUBLIC_STICKER_SHIPPED_LABEL = "Отправлено";

export const PUBLIC_STICKER_SHIPPED_PILL_CLASS =
  "bg-sky-100/90 text-sky-800 ring-1 ring-sky-300/50";

export type PublicStickerOrderStatusPills = {
  currentLabel: string;
  currentPillClass: string;
  nextLabel: string | null;
  nextPillClass: string | null;
};

export function resolveNextLabWorkStatusLabel(
  current: LabWorkStatus,
): string | null {
  const idx = LAB_WORK_STATUS_ORDER.indexOf(current);
  if (idx < 0) {
    const defIdx = LAB_WORK_STATUS_ORDER.indexOf(LAB_WORK_STATUS_DEFAULT);
    if (defIdx >= 0 && defIdx < LAB_WORK_STATUS_ORDER.length - 1) {
      return LAB_WORK_STATUS_LABELS[LAB_WORK_STATUS_ORDER[defIdx + 1]!];
    }
    return null;
  }
  if (current === "TO_ADMINS") return PUBLIC_STICKER_SHIPPED_LABEL;
  if (idx >= LAB_WORK_STATUS_ORDER.length - 1) return null;
  return LAB_WORK_STATUS_LABELS[LAB_WORK_STATUS_ORDER[idx + 1]!];
}

function pillClassForStatusLabel(label: string): string {
  if (label === PUBLIC_STICKER_SHIPPED_LABEL) {
    return PUBLIC_STICKER_SHIPPED_PILL_CLASS;
  }
  const status = LAB_WORK_STATUS_ORDER.find(
    (s) => LAB_WORK_STATUS_LABELS[s] === label,
  );
  return status
    ? LAB_WORK_STATUS_PILL_STYLES[status]
    : LAB_WORK_STATUS_PILL_STYLES[LAB_WORK_STATUS_DEFAULT];
}

/** Текущий и следующий этап наряда для публичной витрины стикера (как в CRM). */
export function resolvePublicStickerOrderStatusPills(input: {
  labWorkStatus: string;
  kaitenColumnTitle?: string | null;
  kaitenCardId?: number | null;
  demoKanbanColumn?: string | null;
  demoCardTypeName?: string | null;
  adminShippedOtpr: boolean;
}): PublicStickerOrderStatusPills {
  if (input.adminShippedOtpr) {
    return {
      currentLabel: PUBLIC_STICKER_SHIPPED_LABEL,
      currentPillClass: PUBLIC_STICKER_SHIPPED_PILL_CLASS,
      nextLabel: null,
      nextPillClass: null,
    };
  }

  const kaitenColTrimmed = String(input.kaitenColumnTitle ?? "").trim();
  const hasKaitenColumn = kaitenColTrimmed.length > 0;
  const hasDemo = Boolean(input.demoKanbanColumn);

  const effectiveStatus =
    labWorkStatusFromColumnTitle(input.kaitenColumnTitle) ??
    normalizeLegacyLabWorkStatus(input.labWorkStatus);

  const currentLabel =
    hasKaitenColumn || hasDemo
      ? kaitenStatusDisplay({
          kaitenColumnTitle: input.kaitenColumnTitle ?? null,
          kaitenCardId: input.kaitenCardId ?? null,
          demoKanbanColumn: input.demoKanbanColumn,
          demoCardTypeName: input.demoCardTypeName,
        })
      : LAB_WORK_STATUS_LABELS[effectiveStatus];

  const currentPillClass =
    hasKaitenColumn || hasDemo
      ? getKaitenColumnPillClassFromOrder({
          kaitenColumnTitle: input.kaitenColumnTitle ?? null,
          demoKanbanColumn: input.demoKanbanColumn,
        })
      : LAB_WORK_STATUS_PILL_STYLES[effectiveStatus];

  const nextLabel = resolveNextLabWorkStatusLabel(effectiveStatus);
  if (!nextLabel) {
    return { currentLabel, currentPillClass, nextLabel: null, nextPillClass: null };
  }

  return {
    currentLabel,
    currentPillClass,
    nextLabel,
    nextPillClass: pillClassForStatusLabel(nextLabel),
  };
}
