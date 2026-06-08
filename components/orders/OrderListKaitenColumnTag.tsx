"use client";

import Link from "next/link";
import { LAB_WORK_STATUS_PILL_STYLES } from "@/lib/lab-work-status";
import { kaitenStatusDisplay } from "@/lib/kaiten-column-title";
import { getKaitenColumnPillClassFromOrder } from "@/lib/order-status-display";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import {
  kaitenOrderToHarmonyTone,
  resolveListPillClass,
} from "@/lib/harmony-list-pill";

function kanbanColumnLabelForNoKaitenPill(
  demoKanbanColumn: string | null | undefined,
  demoCardTypeName: string | null | undefined,
): string | null {
  const raw = String(demoKanbanColumn || "").trim();
  if (!raw) return null;
  const ru =
    raw === "NEW"
      ? "Новые"
      : raw === "IN_PROGRESS"
        ? "В работе"
        : raw === "DONE"
          ? "Готово"
          : raw;
  const typeName = String(demoCardTypeName || "").trim();
  return typeName ? `${ru} · ${typeName}` : ru;
}

type Props = {
  kaitenCardId: number | null;
  demoKanbanColumn?: string | null;
  demoCardTypeName?: string | null;
  kaitenColumnTitle: string | null;
  /** Ссылка фильтра по колонке Kaiten; без неё — только пилюля. */
  filterHref?: string | null;
  /** Компактная пилюля под номером наряда (отгрузки). */
  placement?: "tags" | "underOrderNumber";
};

export function OrderListKaitenColumnTag({
  kaitenCardId,
  demoKanbanColumn,
  demoCardTypeName,
  kaitenColumnTitle,
  filterHref = null,
  placement = "tags",
}: Props) {
  const isHarmony = useUiDesign() === "harmony";
  const kaitenLabel = kaitenStatusDisplay({
    kaitenColumnTitle,
    kaitenCardId,
    demoKanbanColumn,
    demoCardTypeName,
  });
  const hasKaitenColumnLabel = String(kaitenColumnTitle || "").trim().length > 0;
  const showNoKaitenPill = !hasKaitenColumnLabel && kaitenCardId == null;
  const noKaitenKanbanStatus = showNoKaitenPill
    ? kanbanColumnLabelForNoKaitenPill(demoKanbanColumn, demoCardTypeName)
    : null;
  const kaitenColTrimmed = kaitenColumnTitle?.trim() ?? "";
  const kaitenPillClass = getKaitenColumnPillClassFromOrder({
    kaitenColumnTitle: kaitenColTrimmed || null,
    demoKanbanColumn,
  });
  const kaitenHarmonyTone = kaitenOrderToHarmonyTone({
    kaitenColumnTitle: kaitenColTrimmed || null,
    demoKanbanColumn,
  });
  const underOrder = placement === "underOrderNumber";
  const padClass = underOrder
    ? "px-1.5 py-px text-[9px] leading-tight sm:text-[10px]"
    : "order-list-tag-pill";
  const kaitenStatusPillClass = (classicRounded: string) => {
    const tone = noKaitenKanbanStatus ? "gray" : kaitenHarmonyTone;
    return isHarmony
      ? `${resolveListPillClass(true, "", tone)} ${padClass}`
      : `${classicRounded} ${padClass}`;
  };

  const pill =
    noKaitenKanbanStatus ? (
      <span
        className={kaitenStatusPillClass(
          `inline-flex min-w-0 max-w-full items-center truncate rounded-full text-center font-semibold uppercase tracking-wide shadow-sm ${LAB_WORK_STATUS_PILL_STYLES.TO_SCAN}`,
        )}
        title={noKaitenKanbanStatus}
      >
        <span className="inline-flex min-w-0 flex-col leading-tight normal-case">
          <span className="truncate font-semibold uppercase">Нет в Kaiten</span>
          <span className="truncate text-[8px] font-medium opacity-90 sm:text-[9px]">
            {noKaitenKanbanStatus}
          </span>
        </span>
      </span>
    ) : (
      <span
        className={kaitenStatusPillClass(
          `inline-flex min-w-0 max-w-full items-center truncate rounded-full text-center font-semibold uppercase tracking-wide shadow-sm ${kaitenPillClass}${underOrder ? "" : " px-2 py-0.5"}`,
        )}
        title={kaitenLabel}
      >
        <span className="truncate">{kaitenLabel}</span>
      </span>
    );

  const wrapClass = underOrder
    ? "flex w-full min-w-0 justify-center"
    : "inline-flex min-w-0 max-w-full items-center truncate text-left";

  if (filterHref) {
    return (
      <Link
        href={filterHref}
        title="Показать наряды в этой колонке Kaiten"
        className={`${wrapClass} text-inherit no-underline outline-none transition-opacity hover:opacity-90 focus-visible:outline-none`}
      >
        {pill}
      </Link>
    );
  }

  return (
    <span
      title="Колонка доски Kaiten (обновляется в фоне на списке заказов)"
      className={wrapClass}
    >
      {pill}
    </span>
  );
}
