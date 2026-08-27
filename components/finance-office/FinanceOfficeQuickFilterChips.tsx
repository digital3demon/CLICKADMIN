"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSessionUser } from "@/components/providers/SessionUserProvider";
import { canSeeOrderNotificationKind } from "@/lib/auth/permissions";
import { financeOfficeListHref } from "@/lib/finance-office-list-query";
import {
  humanListTagLabel,
  LIST_TAG_EDO,
  LIST_TAG_FINANCE_CALCULATED,
  LIST_TAG_FINANCE_NOT_CALCULATED,
  LIST_TAG_KAITEN_LAB_MENTION,
  LIST_TAG_NO_EDO,
  LIST_TAG_EDO_PAPER,
  LIST_TAG_ORDER_ATTENTION,
  LIST_TAG_PROSTHETICS_PENDING,
  LIST_TAG_WAIT_PAYMENT,
  type ParsedListTag,
} from "@/lib/order-list-tag-filter";

type FinanceOfficeChipCounts = {
  attentionCount: number;
  prostheticsPendingCount: number;
  financeNotCalculatedCount: number;
  financeCalculatedCount: number;
  edoCount: number;
  noEdoCount: number;
  edoPaperCount: number;
  labMentionCount: number;
  waitPaymentCount: number;
};

const EMPTY_COUNTS: FinanceOfficeChipCounts = {
  attentionCount: 0,
  prostheticsPendingCount: 0,
  financeNotCalculatedCount: 0,
  financeCalculatedCount: 0,
  edoCount: 0,
  noEdoCount: 0,
  edoPaperCount: 0,
  labMentionCount: 0,
  waitPaymentCount: 0,
};

export function FinanceOfficeQuickFilterChips({
  activeFilter = null,
  tab,
  periodFrom,
  periodTo,
  q = "",
  listTag = null,
  ship = null,
  shipFrom = null,
  shipTo = null,
  invFrom = null,
  invTo = null,
}: {
  activeFilter?: ParsedListTag | null;
  tab: string;
  periodFrom: string | null;
  periodTo: string | null;
  q?: string;
  listTag?: string | null;
  ship?: string | null;
  shipFrom?: string | null;
  shipTo?: string | null;
  invFrom?: string | null;
  invTo?: string | null;
}) {
  const [counts, setCounts] = useState<FinanceOfficeChipCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCountsLoading(true);

    const params = new URLSearchParams();
    params.set("tab", tab);
    if (periodFrom) params.set("from", periodFrom);
    if (periodTo) params.set("to", periodTo);
    if (ship) params.set("ship", ship);
    if (shipFrom) params.set("shipFrom", shipFrom);
    if (shipTo) params.set("shipTo", shipTo);
    if (invFrom) params.set("invFrom", invFrom);
    if (invTo) params.set("invTo", invTo);
    const trimmedQ = q.trim();
    if (trimmedQ) params.set("q", trimmedQ);
    const trimmedTag = (listTag || "").trim();
    if (trimmedTag) params.set("tag", trimmedTag);

    void fetch(`/api/finance-office/chip-counts?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (res) => {
        const j = (await res.json().catch(() => ({}))) as Partial<
          FinanceOfficeChipCounts
        >;
        if (cancelled) return;
        if (!res.ok) {
          setCounts(EMPTY_COUNTS);
          return;
        }
        setCounts({
          attentionCount:
            typeof j.attentionCount === "number" ? j.attentionCount : 0,
          prostheticsPendingCount:
            typeof j.prostheticsPendingCount === "number"
              ? j.prostheticsPendingCount
              : 0,
          financeNotCalculatedCount:
            typeof j.financeNotCalculatedCount === "number"
              ? j.financeNotCalculatedCount
              : 0,
          financeCalculatedCount:
            typeof j.financeCalculatedCount === "number"
              ? j.financeCalculatedCount
              : 0,
          edoCount: typeof j.edoCount === "number" ? j.edoCount : 0,
          noEdoCount: typeof j.noEdoCount === "number" ? j.noEdoCount : 0,
          edoPaperCount:
            typeof j.edoPaperCount === "number" ? j.edoPaperCount : 0,
          labMentionCount:
            typeof j.labMentionCount === "number" ? j.labMentionCount : 0,
          waitPaymentCount:
            typeof j.waitPaymentCount === "number" ? j.waitPaymentCount : 0,
        });
      })
      .catch(() => {
        if (!cancelled) setCounts(EMPTY_COUNTS);
      })
      .finally(() => {
        if (!cancelled) setCountsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, periodFrom, periodTo, q, listTag, ship, shipFrom, shipTo]);

  const {
    attentionCount,
    prostheticsPendingCount,
    financeNotCalculatedCount,
    financeCalculatedCount,
    edoCount,
    noEdoCount,
    edoPaperCount,
    labMentionCount,
    waitPaymentCount,
  } = counts ?? EMPTY_COUNTS;

  const { user } = useSessionUser();
  const canCorrections = canSeeOrderNotificationKind(
    "corrections",
    user?.role,
    user?.moduleAccess,
  );
  const canProsthetics = canSeeOrderNotificationKind(
    "prosthetics",
    user?.role,
    user?.moduleAccess,
  );
  const canAdmin = canSeeOrderNotificationKind(
    "admin",
    user?.role,
    user?.moduleAccess,
  );

  const listCtx = {
    tab,
    from: periodFrom,
    to: periodTo,
    q: q.trim() || undefined,
    ship: ship ?? undefined,
    shipFrom: shipFrom ?? undefined,
    shipTo: shipTo ?? undefined,
    invFrom: invFrom ?? undefined,
    invTo: invTo ?? undefined,
  };

  const showCorrections =
    canCorrections &&
    (attentionCount > 0 || activeFilter?.kind === "orderAttention");
  const showProsthetics =
    canProsthetics &&
    (prostheticsPendingCount > 0 ||
      activeFilter?.kind === "prostheticsPending");
  const showNotCalculated =
    financeNotCalculatedCount > 0 ||
    activeFilter?.kind === "financeNotCalculated";
  const showCalculated =
    financeCalculatedCount > 0 || activeFilter?.kind === "financeCalculated";
  const showEdo = edoCount > 0 || activeFilter?.kind === "edo";
  const showNoEdo = noEdoCount > 0 || activeFilter?.kind === "noEdo";
  const showEdoPaper = edoPaperCount > 0 || activeFilter?.kind === "edoPaper";
  const showWaitPayment =
    waitPaymentCount > 0 || activeFilter?.kind === "waitPayment";
  const showChat =
    canAdmin &&
    (labMentionCount > 0 || activeFilter?.kind === "kaitenLabMention");

  const showRow =
    showCorrections ||
    showProsthetics ||
    showNotCalculated ||
    showCalculated ||
    showEdo ||
    showEdoPaper ||
    showNoEdo ||
    showWaitPayment ||
    showChat ||
    activeFilter != null;

  if (!showRow && countsLoading) {
    return (
      <div className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <p className="text-xs text-[var(--text-muted)]">Загрузка фильтров…</p>
      </div>
    );
  }

  if (!showRow) return null;
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
                ? "border-amber-500 bg-amber-400 text-amber-950 ring-2 ring-amber-400/90 dark:border-amber-400 dark:bg-amber-500 dark:text-amber-950 dark:ring-amber-400/80"
                : "border-amber-400/80 bg-amber-300/90 text-amber-950 hover:bg-amber-300 dark:border-amber-500/70 dark:bg-amber-600/55 dark:text-amber-50 dark:hover:bg-amber-600/70"
            }`}
            title="Непринятые корректировки из чата («!!!») и наряды, где сумма счёта не сходится с составом"
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
        {showWaitPayment ? (
          <Link
            href={financeOfficeListHref({
              ...listCtx,
              tag: LIST_TAG_WAIT_PAYMENT,
            })}
            className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
              activeFilter?.kind === "waitPayment"
                ? "border-rose-400/90 bg-rose-100 text-rose-950 ring-2 ring-rose-500/85 dark:border-rose-700 dark:bg-rose-950/45 dark:text-rose-100 dark:ring-rose-500/70"
                : "border-rose-300/70 bg-rose-100/70 text-rose-950 hover:bg-rose-100 dark:border-rose-800/60 dark:bg-rose-950/35 dark:text-rose-100 dark:hover:bg-rose-950/50"
            }`}
            title={
              tab === "all"
                ? "Наряды с отметкой «ждем оплату» (все наряды, как в Заказах)"
                : "Наряды с отметкой «ждем оплату» (в выбранном периоде)"
            }
          >
            <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
              Ждем оплату
            </span>
            <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
              {waitPaymentCount}
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
            title="Клиника только по ЭДО (в т.ч. ИП врача)"
          >
            <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
              ЭДО
            </span>
            <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
              {edoCount}
            </span>
          </Link>
        ) : null}
        {showEdoPaper ? (
          <Link
            href={financeOfficeListHref({
              ...listCtx,
              tag: LIST_TAG_EDO_PAPER,
            })}
            className={`group inline-flex items-stretch overflow-hidden rounded-full border shadow-sm transition-colors ${
              activeFilter?.kind === "edoPaper"
                ? "border-cyan-400/90 bg-slate-800 text-teal-50 ring-2 ring-teal-400/80 dark:border-teal-400 dark:bg-slate-900 dark:text-teal-50 dark:ring-teal-400/70"
                : "border-teal-500/70 bg-slate-800/90 text-teal-50 hover:bg-slate-800 dark:border-slate-600 dark:bg-slate-900/70 dark:text-teal-100 dark:hover:bg-slate-900"
            }`}
            title="Клиника работает и по ЭДО, и по бумдокам"
          >
            <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
              ЭДО+бумдоки
            </span>
            <span className="inline-flex min-w-[2.25rem] items-center justify-center border-l border-current/25 px-2 py-1.5 text-sm font-bold sm:py-2">
              {edoPaperCount}
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
            title="Бумажный документооборот или наряд без клиники"
          >
            <span className="px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2">
              бумдоки
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
