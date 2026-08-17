"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { LAB_WORK_STATUS_PILL_STYLES } from "@/lib/lab-work-status";
import {
  kaitenStatusDisplay,
  kaitenTrackLaneListLabel,
} from "@/lib/kaiten-column-title";
import { getKaitenColumnPillClassFromOrder } from "@/lib/order-status-display";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import {
  kaitenOrderToHarmonyTone,
  resolveListPillClass,
  type HarmonyPillTone,
} from "@/lib/harmony-list-pill";
import {
  listTagKaitenTrackLane,
  parseKaitenTrackLaneValue,
} from "@/lib/order-list-tag-filter";

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

const STOP_PILL_CLASSIC =
  "inline-flex min-w-0 max-w-full items-center truncate rounded-full border border-red-500/90 bg-red-600 text-center font-bold uppercase tracking-wide text-white shadow-sm dark:border-red-400/70 dark:bg-red-700";

const BOARD_PILL_CLASSIC_ORTHO =
  "inline-flex min-w-0 max-w-full items-center truncate rounded-full border border-neutral-400/80 bg-neutral-200 text-center font-semibold uppercase tracking-wide text-neutral-900 dark:border-neutral-400/70 dark:bg-neutral-600 dark:text-neutral-50";

const BOARD_PILL_CLASSIC_ODON =
  "inline-flex min-w-0 max-w-full items-center truncate rounded-full border border-slate-400/80 bg-slate-200 text-center font-semibold uppercase tracking-wide text-slate-900 dark:border-slate-400/70 dark:bg-slate-600 dark:text-slate-50";

const BOARD_PILL_CLASSIC_TEST =
  "inline-flex min-w-0 max-w-full items-center truncate rounded-full border border-amber-400/70 bg-amber-100 text-center font-semibold uppercase tracking-wide text-amber-950 dark:border-amber-500/60 dark:bg-amber-900/75 dark:text-amber-50";

function boardLaneTone(label: string): HarmonyPillTone {
  if (label === "Ортодонтия") return "slate";
  if (label === "Тест") return "yellow";
  return "stone";
}

function boardLaneClassicClass(label: string): string {
  if (label === "Ортодонтия") return BOARD_PILL_CLASSIC_ODON;
  if (label === "Тест") return BOARD_PILL_CLASSIC_TEST;
  return BOARD_PILL_CLASSIC_ORTHO;
}

function boardLanePill(
  label: string,
  isHarmony: boolean,
  underOrder: boolean,
  href: string | null,
) {
  const padClass = underOrder
    ? "px-2 py-px text-[10px] leading-tight sm:px-2.5 sm:text-[11px]"
    : "px-1.5 py-px text-[9px] leading-tight";
  const tone = boardLaneTone(label);
  const pill = (
    <span
      className={
        isHarmony
          ? `${resolveListPillClass(true, "", tone)} ${padClass}`
          : `${boardLaneClassicClass(label)} ${padClass}`
      }
      title={href ? `Показать наряды: ${label}` : `Доска: ${label}`}
    >
      <span className="truncate">{label}</span>
    </span>
  );
  if (!href) return pill;
  return (
    <Link
      prefetch={false}
      href={href}
      data-row-click-ignore
      title={`Показать наряды: ${label}`}
      className="inline-flex min-w-0 max-w-full text-inherit no-underline outline-none transition-opacity hover:opacity-90 focus-visible:outline-none"
    >
      {pill}
    </Link>
  );
}

function wrapStatusAndBoard(
  statusNode: ReactNode,
  boardLabel: string | null,
  isHarmony: boolean,
  underOrder: boolean,
  boardFilterHref: string | null,
) {
  return (
    <span className="flex w-full min-w-0 flex-col items-center justify-center gap-0.5 -translate-y-0.5">
      {statusNode}
      {boardLabel
        ? boardLanePill(boardLabel, isHarmony, underOrder, boardFilterHref)
        : null}
    </span>
  );
}

type Props = {
  kaitenCardId: number | null;
  demoKanbanColumn?: string | null;
  demoCardTypeName?: string | null;
  kaitenColumnTitle: string | null;
  /** Доска Kaiten: ортопедия / ортодонтия — вторая пилюля под статусом. */
  kaitenTrackLane?: string | null;
  /** Карточка в СТОП / заблокирована в Kaiten — вместо колонки красная пилюля «СТОП». */
  kaitenBlocked?: boolean;
  kaitenBlockReason?: string | null;
  /** Ссылка фильтра по колонке Kaiten; без неё — только пилюля. */
  filterHref?: string | null;
  /** Строит ссылку фильтра по ключу `tag=` — пилюля доски работает как фильтр. */
  makeTagHref?: ((tag: string) => string) | null;
  /** Компактная пилюля под номером наряда (отгрузки). */
  placement?: "tags" | "underOrderNumber";
};

export function OrderListKaitenColumnTag({
  kaitenCardId,
  demoKanbanColumn,
  demoCardTypeName,
  kaitenColumnTitle,
  kaitenTrackLane = null,
  kaitenBlocked = false,
  kaitenBlockReason = null,
  filterHref = null,
  makeTagHref = null,
  placement = "tags",
}: Props) {
  const isHarmony = useUiDesign() === "harmony";
  const underOrder = placement === "underOrderNumber";
  const boardLabel = kaitenTrackLaneListLabel(kaitenTrackLane);
  const laneKey = parseKaitenTrackLaneValue(kaitenTrackLane);
  const boardFilterHref =
    laneKey && makeTagHref ? makeTagHref(listTagKaitenTrackLane(laneKey)) : null;
  // Под №: чуть крупнее и с запасом по бокам (раньше text-[9–10px]/px-1.5 было «впритык»).
  const padClass = underOrder
    ? "px-2 py-0.5 text-[11px] leading-tight sm:px-2.5 sm:text-[12px]"
    : "order-list-tag-pill";

  const wrapClass = underOrder
    ? "flex w-full min-w-0 justify-center"
    : "inline-flex min-w-0 max-w-full items-center truncate text-left";

  if (kaitenBlocked) {
    const reason = String(kaitenBlockReason || "").trim();
    const stopTitle = reason
      ? `СТОП: ${reason}`
      : "СТОП — карточка остановлена";
    const stopPill = (
      <span
        className={
          isHarmony
            ? `${resolveListPillClass(true, "", "red")} ${padClass} font-bold uppercase tracking-wide`
            : `${STOP_PILL_CLASSIC} ${padClass}`
        }
        title={stopTitle}
      >
        <span className="truncate">СТОП</span>
      </span>
    );
  if (filterHref) {
    return wrapStatusAndBoard(
      <Link prefetch={false}
        href={filterHref}
        title="Показать наряды в СТОП"
        className={`${wrapClass} text-inherit no-underline outline-none transition-opacity hover:opacity-90 focus-visible:outline-none`}
      >
        {stopPill}
      </Link>,
      boardLabel,
      isHarmony,
      underOrder,
      boardFilterHref,
    );
  }
  return wrapStatusAndBoard(
    <span title={stopTitle} className={wrapClass}>
      {stopPill}
    </span>,
    boardLabel,
    isHarmony,
    underOrder,
    boardFilterHref,
  );
}

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

  if (filterHref) {
    return wrapStatusAndBoard(
      <Link prefetch={false}
        href={filterHref}
        title="Показать наряды в этой колонке Kaiten"
        className={`${wrapClass} text-inherit no-underline outline-none transition-opacity hover:opacity-90 focus-visible:outline-none`}
      >
        {pill}
      </Link>,
      boardLabel,
      isHarmony,
      underOrder,
      boardFilterHref,
    );
  }

  return wrapStatusAndBoard(
    <span
      title="Колонка доски Kaiten (обновляется в фоне на списке заказов)"
      className={wrapClass}
    >
      {pill}
    </span>,
    boardLabel,
    isHarmony,
    underOrder,
    boardFilterHref,
  );
}
