import Link from "next/link";
import { financeOfficeListHref } from "@/lib/finance-office-list-query";
import {
  humanListTagLabel,
  LIST_TAG_EDO,
  LIST_TAG_FINANCE_CALCULATED,
  LIST_TAG_FINANCE_NOT_CALCULATED,
  LIST_TAG_KAITEN_LAB_MENTION,
  LIST_TAG_NO_EDO,
  LIST_TAG_ORDER_ATTENTION,
  LIST_TAG_PROSTHETICS_PENDING,
  type ParsedListTag,
} from "@/lib/order-list-tag-filter";

export function FinanceOfficeQuickFilterChips({
  attentionCount,
  prostheticsPendingCount,
  financeNotCalculatedCount,
  financeCalculatedCount,
  edoCount,
  noEdoCount,
  labMentionCount,
  activeFilter = null,
  tab,
  periodFrom,
  periodTo,
  q = "",
}: {
  attentionCount: number;
  prostheticsPendingCount: number;
  financeNotCalculatedCount: number;
  financeCalculatedCount: number;
  edoCount: number;
  noEdoCount: number;
  labMentionCount: number;
  activeFilter?: ParsedListTag | null;
  tab: string;
  periodFrom: string | null;
  periodTo: string | null;
  q?: string;
}) {
  const listCtx = {
    tab,
    from: periodFrom,
    to: periodTo,
    q: q.trim() || undefined,
  };

  const showRow =
    attentionCount > 0 ||
    prostheticsPendingCount > 0 ||
    financeNotCalculatedCount > 0 ||
    financeCalculatedCount > 0 ||
    edoCount > 0 ||
    noEdoCount > 0 ||
    labMentionCount > 0 ||
    activeFilter != null;

  if (!showRow) return null;

  const showCorrections =
    attentionCount > 0 || activeFilter?.kind === "orderAttention";
  const showProsthetics =
    prostheticsPendingCount > 0 || activeFilter?.kind === "prostheticsPending";
  const showNotCalculated =
    financeNotCalculatedCount > 0 || activeFilter?.kind === "financeNotCalculated";
  const showCalculated =
    financeCalculatedCount > 0 || activeFilter?.kind === "financeCalculated";
  const showEdo = edoCount > 0 || activeFilter?.kind === "edo";
  const showNoEdo = noEdoCount > 0 || activeFilter?.kind === "noEdo";
  const showChat =
    labMentionCount > 0 || activeFilter?.kind === "kaitenLabMention";

  return (
    <div className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
      <div className="flex flex-wrap items-center gap-2">
        {showCorrections ? (
          <Link
            href={financeOfficeListHref({
              ...listCtx,
              tag: LIST_TAG_ORDER_ATTENTION,
            })}
            className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
              activeFilter?.kind === "orderAttention"
                ? "border-amber-400/90 bg-amber-100 text-amber-950 ring-2 ring-amber-500/85 dark:border-amber-700 dark:bg-amber-950/45 dark:text-amber-100 dark:ring-amber-500/70"
                : "border-amber-300/70 bg-amber-100/70 text-amber-950 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100 dark:hover:bg-amber-950/50"
            }`}
            title="Наряды с непринятыми корректировками из чата («!!!»); в списке также может попасть расхождение суммы счёта с составом"
          >
            <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
              Корректировки
            </span>
            <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
              {attentionCount}
            </span>
          </Link>
        ) : null}
        {showProsthetics ? (
          <Link
            href={financeOfficeListHref({
              ...listCtx,
              tag: LIST_TAG_PROSTHETICS_PENDING,
            })}
            className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
              activeFilter?.kind === "prostheticsPending"
                ? "border-sky-400/90 bg-sky-100 text-sky-950 ring-2 ring-sky-500/85 dark:border-sky-700 dark:bg-sky-950/45 dark:text-sky-100 dark:ring-sky-500/70"
                : "border-sky-300/70 bg-sky-100/70 text-sky-950 hover:bg-sky-100 dark:border-sky-800/60 dark:bg-sky-950/35 dark:text-sky-100 dark:hover:bg-sky-950/50"
            }`}
            title="Быстрый фильтр по тегу «Заказ протетики»"
          >
            <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
              Заказ протетики
            </span>
            <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
              {prostheticsPendingCount}
            </span>
          </Link>
        ) : null}
        {showNotCalculated ? (
          <Link
            href={financeOfficeListHref({
              ...listCtx,
              tag: LIST_TAG_FINANCE_NOT_CALCULATED,
            })}
            className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
              activeFilter?.kind === "financeNotCalculated"
                ? "border-orange-400/90 bg-orange-100 text-orange-950 ring-2 ring-orange-500/85 dark:border-orange-700 dark:bg-orange-950/45 dark:text-orange-100 dark:ring-orange-500/70"
                : "border-orange-300/70 bg-orange-100/70 text-orange-950 hover:bg-orange-100 dark:border-orange-800/60 dark:bg-orange-950/35 dark:text-orange-100 dark:hover:bg-orange-950/50"
            }`}
            title="Наряды без отметки «Просчитано» (в выбранном периоде)"
          >
            <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
              Не просчитано
            </span>
            <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
              {financeNotCalculatedCount}
            </span>
          </Link>
        ) : null}
        {showCalculated ? (
          <Link
            href={financeOfficeListHref({
              ...listCtx,
              tag: LIST_TAG_FINANCE_CALCULATED,
            })}
            className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
              activeFilter?.kind === "financeCalculated"
                ? "border-emerald-400/90 bg-emerald-100 text-emerald-950 ring-2 ring-emerald-500/85 dark:border-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-500/70"
                : "border-emerald-300/70 bg-emerald-100/70 text-emerald-950 hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/35 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
            }`}
            title="Наряды с отметкой «Просчитано» (в выбранном периоде)"
          >
            <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
              Просчитано
            </span>
            <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
              {financeCalculatedCount}
            </span>
          </Link>
        ) : null}
        {showEdo ? (
          <Link
            href={financeOfficeListHref({
              ...listCtx,
              tag: LIST_TAG_EDO,
            })}
            className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
              activeFilter?.kind === "edo"
                ? "border-teal-400/90 bg-teal-100 text-teal-950 ring-2 ring-teal-500/85 dark:border-teal-700 dark:bg-teal-950/45 dark:text-teal-100 dark:ring-teal-500/70"
                : "border-teal-300/70 bg-teal-100/70 text-teal-950 hover:bg-teal-100 dark:border-teal-800/60 dark:bg-teal-950/35 dark:text-teal-100 dark:hover:bg-teal-950/50"
            }`}
            title="Клиника работает по ЭДО (в т.ч. ИП врача)"
          >
            <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
              ЭДО
            </span>
            <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
              {edoCount}
            </span>
          </Link>
        ) : null}
        {showNoEdo ? (
          <Link
            href={financeOfficeListHref({
              ...listCtx,
              tag: LIST_TAG_NO_EDO,
            })}
            className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
              activeFilter?.kind === "noEdo"
                ? "border-slate-400/90 bg-slate-100 text-slate-950 ring-2 ring-slate-500/85 dark:border-slate-600 dark:bg-slate-950/45 dark:text-slate-100 dark:ring-slate-500/70"
                : "border-slate-300/70 bg-slate-100/70 text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900/35 dark:text-slate-100 dark:hover:bg-slate-900/50"
            }`}
            title="Клиника без ЭДО или наряд без клиники"
          >
            <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
              БЕЗ ЭДО
            </span>
            <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
              {noEdoCount}
            </span>
          </Link>
        ) : null}
        {showChat ? (
          <Link
            href={financeOfficeListHref({
              ...listCtx,
              tag: LIST_TAG_KAITEN_LAB_MENTION,
            })}
            className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
              activeFilter?.kind === "kaitenLabMention"
                ? "border-violet-400/90 bg-violet-100 text-violet-950 ring-2 ring-violet-500/90 dark:border-violet-600 dark:bg-violet-950/45 dark:text-violet-100 dark:ring-violet-500/75"
                : "border-violet-300/70 bg-violet-100/70 text-violet-950 hover:bg-violet-100 dark:border-violet-800/60 dark:bg-violet-950/35 dark:text-violet-100 dark:hover:bg-violet-950/50"
            }`}
            title="Наряды с непрочитанным упоминанием лаборатории в чате Kaiten (@…)"
          >
            <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
              ЧАТ
            </span>
            <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
              {labMentionCount}
            </span>
          </Link>
        ) : null}
        {activeFilter ? (
          <span className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-md border border-sky-200/80 bg-sky-50/80 px-2 py-1 text-sm dark:border-sky-900/50 dark:bg-sky-950/25">
            <span className="min-w-0 truncate whitespace-nowrap text-[var(--text-body)]">
              Фильтр по тегу:{" "}
              <strong className="text-[var(--text-strong)]">
                {humanListTagLabel(activeFilter)}
              </strong>
            </span>
            <Link
              href={financeOfficeListHref(listCtx)}
              className="shrink-0 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-0.5 text-xs font-medium text-[var(--sidebar-blue)] hover:bg-[var(--table-row-hover)]"
            >
              Сбросить
            </Link>
          </span>
        ) : null}
      </div>
    </div>
  );
}
