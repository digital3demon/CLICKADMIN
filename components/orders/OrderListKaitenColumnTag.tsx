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

const STOP_PILL_CLASSIC =
  "inline-flex min-w-0 max-w-full items-center truncate rounded-full border border-red-500/90 bg-red-600 text-center font-bold uppercase tracking-wide text-white shadow-sm dark:border-red-400/70 dark:bg-red-700";

const BOARD_LABEL_BASE =
  "inline-flex min-w-0 max-w-full items-center truncate text-center font-medium uppercase tracking-wide";

/** Ортопедия — тёплый светло-серый, без обёртки. */
const BOARD_LABEL_ORTHO = `${BOARD_LABEL_BASE} text-stone-400 dark:text-stone-400`;

/** Ортодонтия — холодный светло-серый, без обёртки. */
const BOARD_LABEL_ODON = `${BOARD_LABEL_BASE} text-slate-400 dark:text-slate-400`;

const BOARD_LABEL_TEST = `${BOARD_LABEL_BASE} text-amber-500/80 dark:text-amber-400/75`;

function boardLaneLabelClass(label: string): string {
  if (label === "Ортодонтия") return BOARD_LABEL_ODON;
  if (label === "Тест") return BOARD_LABEL_TEST;
  return BOARD_LABEL_ORTHO;
}

function boardLanePill(
  label: string,
  underOrder: boolean,
  href: string | null,
) {
  const padClass = underOrder
    ? "px-0.5 py-px text-[9px] leading-tight sm:text-[10px]"
    : "px-0.5 py-px text-[8px] leading-tight";
  const text = (
    <span
      className={`${boardLaneLabelClass(label)} ${padClass}`}
      title={href ? `Показать наряды: ${label}` : `Доска: ${label}`}
    >
      <span className="truncate">{label}</span>
    </span>
  );
  if (!href) return text;
  return (
    <Link
      prefetch={false}
      href={href}
      data-row-click-ignore
      title={`Показать наряды: ${label}`}
      className="inline-flex min-w-0 max-w-full text-inherit no-underline outline-none transition-opacity hover:opacity-80 focus-visible:outline-none"
    >
      {text}
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
    <span className="flex w-full min-w-0 flex-col items-center justify-center gap-1.5 -translate-y-0.5">
      {statusNode}
      {boardLabel
        ? boardLanePill(boardLabel, underOrder, boardFilterHref)
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
  /** Ссылка фильтра по доске (ортопедия / ортодонтия); без неё — только пилюля. */
  boardFilterHref?: string | null;
  /** Компактная пилюля под номером наряда (отгрузки). */
  placement?: "tags" | "underOrderNumber";
  /** Демо: без брендинга Kaiten — только статус канбана. */
  isDemoMode?: boolean;
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
  boardFilterHref = null,
  placement = "tags",
  isDemoMode = false,
}: Props) {
  const isHarmony = useUiDesign() === "harmony";
  const underOrder = placement === "underOrderNumber";
  const boardLabel = isDemoMode
    ? null
    : kaitenTrackLaneListLabel(kaitenTrackLane);
  // Под №: чуть крупнее и с запасом по бокам (раньше text-[9–10px]/px-1.5 было «впритык»).
  const padClass = underOrder
    ? "px-2 py-0.5 text-[11px] leading-tight sm:px-2.5 sm:text-[12px]"
    : "order-list-tag-pill";

  const wrapClass = underOrder
    ? "flex w-full min-w-0 justify-center"
    : "inline-flex min-w-0 max-w-full items-center truncate text-left";

  if (kaitenBlocked && !isDemoMode) {
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
    kaitenColumnTitle: isDemoMode ? null : kaitenColumnTitle,
    kaitenCardId: isDemoMode ? null : kaitenCardId,
    demoKanbanColumn,
    demoCardTypeName,
  });
  const hasKaitenColumnLabel =
    !isDemoMode && String(kaitenColumnTitle || "").trim().length > 0;
  const demoColLabel = kanbanColumnLabelForNoKaitenPill(
    demoKanbanColumn,
    demoCardTypeName,
  );
  /** Есть колонка демо-канбана — только она, без «Нет в Kaiten». */
  const demoKanbanStatus =
    isDemoMode || demoColLabel
      ? (demoColLabel ?? (isDemoMode ? kaitenLabel : null))
      : null;
  const showNoKaitenPill =
    !isDemoMode &&
    !demoColLabel &&
    !hasKaitenColumnLabel &&
    kaitenCardId == null;
  const effectiveFilterHref = isDemoMode ? null : filterHref;
  const effectiveBoardFilterHref = isDemoMode ? null : boardFilterHref;
  const kaitenColTrimmed = isDemoMode
    ? ""
    : (kaitenColumnTitle?.trim() ?? "");
  const kaitenPillClass = getKaitenColumnPillClassFromOrder({
    kaitenColumnTitle: kaitenColTrimmed || null,
    demoKanbanColumn,
  });
  const kaitenHarmonyTone = kaitenOrderToHarmonyTone({
    kaitenColumnTitle: kaitenColTrimmed || null,
    demoKanbanColumn,
  });
  const kaitenStatusPillClass = (classicRounded: string) => {
    const tone =
      showNoKaitenPill || demoKanbanStatus ? "gray" : kaitenHarmonyTone;
    return isHarmony
      ? `${resolveListPillClass(true, "", tone)} ${padClass}`
      : `${classicRounded} ${padClass}`;
  };

  const pill =
    demoKanbanStatus ? (
      <span
        className={kaitenStatusPillClass(
          `inline-flex min-w-0 max-w-full items-center truncate rounded-full text-center font-semibold uppercase tracking-wide shadow-sm ${LAB_WORK_STATUS_PILL_STYLES.TO_SCAN}`,
        )}
        title={demoKanbanStatus}
      >
        <span className="truncate">{demoKanbanStatus}</span>
      </span>
    ) : showNoKaitenPill ? (
      <span
        className={kaitenStatusPillClass(
          `inline-flex min-w-0 max-w-full items-center truncate rounded-full text-center font-semibold uppercase tracking-wide shadow-sm ${LAB_WORK_STATUS_PILL_STYLES.TO_SCAN}`,
        )}
        title="Нет в Kaiten"
      >
        <span className="truncate font-semibold uppercase">Нет в Kaiten</span>
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

  if (effectiveFilterHref) {
    return wrapStatusAndBoard(
      <Link prefetch={false}
        href={effectiveFilterHref}
        title="Показать наряды в этой колонке Kaiten"
        className={`${wrapClass} text-inherit no-underline outline-none transition-opacity hover:opacity-90 focus-visible:outline-none`}
      >
        {pill}
      </Link>,
      boardLabel,
      isHarmony,
      underOrder,
      effectiveBoardFilterHref,
    );
  }

  return wrapStatusAndBoard(
    <span
      title={
        isDemoMode
          ? "Статус карточки в канбане"
          : "Колонка доски Kaiten (обновляется в фоне на списке заказов)"
      }
      className={wrapClass}
    >
      {pill}
    </span>,
    boardLabel,
    isHarmony,
    underOrder,
    effectiveBoardFilterHref,
  );
}
