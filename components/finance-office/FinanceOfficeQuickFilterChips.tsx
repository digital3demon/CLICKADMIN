import Link from "next/link";
import { financeOfficeListHref } from "@/lib/finance-office-list-query";
import {
  humanListTagLabel,
  LIST_TAG_ORDER_ATTENTION,
  LIST_TAG_PROSTHETICS_PENDING,
  type ParsedListTag,
} from "@/lib/order-list-tag-filter";

export function FinanceOfficeQuickFilterChips({
  attentionCount,
  prostheticsPendingCount,
  activeFilter = null,
  tab,
  periodFrom,
  periodTo,
  q = "",
}: {
  attentionCount: number;
  prostheticsPendingCount: number;
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

  return (
    <div className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
      <div className="flex flex-wrap items-center gap-2">
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
