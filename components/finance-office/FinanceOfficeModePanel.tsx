"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { financeOfficeListHref } from "@/lib/finance-office-list-query";
import { moscowTodayYmd, moscowTomorrowYmd } from "@/lib/shipments-date-range";
import type { FinanceOfficeMode } from "@/lib/finance-office-list-filter";

export type { FinanceOfficeMode };

/**
 * Макет как у отгрузок: Актуальное · за период · сегодня · завтра · даты · Показать.
 * Навигация через Link / GET-форму — без ожидания soft-nav router.push.
 */
export function FinanceOfficeModePanel({
  mode,
  appliedFrom,
  appliedTo,
  listTag = null,
  q = "",
  listSummaryLine = null,
}: {
  mode: FinanceOfficeMode;
  appliedFrom: string | null;
  appliedTo: string | null;
  listTag?: string | null;
  q?: string | null;
  /** Текст выбранного режима и счётчик нарядов — в одной полосе с кнопками. */
  listSummaryLine?: string | null;
}) {
  const defaultTo = useMemo(() => moscowTodayYmd(), []);
  const tomorrowYmd = useMemo(() => moscowTomorrowYmd(), []);
  const [from, setFrom] = useState(() => appliedFrom ?? "");
  const [to, setTo] = useState(() => appliedTo ?? defaultTo);

  useEffect(() => {
    setFrom(appliedFrom ?? "");
    setTo(appliedTo ?? defaultTo);
  }, [appliedFrom, appliedTo, defaultTo]);

  const allHref = financeOfficeListHref({
    tab: "all",
    tag: listTag,
    q: q?.trim() || undefined,
  });
  const actualHref = financeOfficeListHref({
    tab: "actual",
    tag: listTag,
    q: q?.trim() || undefined,
  });

  const dateInp =
    "h-8 w-[6.75rem] min-w-0 max-w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-1 py-0.5 text-[11px] text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:h-9 sm:w-[7.5rem] sm:text-xs";

  const allActive = mode === "all";
  const actualActive = mode === "actual";
  const periodActive = mode === "period";
  const periodHref = (ymd: string) =>
    financeOfficeListHref({
      tab: "period",
      from: ymd,
      to: ymd,
      tag: listTag,
      q: q?.trim() || undefined,
    });
  const todayActive =
    periodActive && appliedFrom === defaultTo && appliedTo === defaultTo;
  const tomorrowActive =
    periodActive && appliedFrom === tomorrowYmd && appliedTo === tomorrowYmd;
  const dayBtn = (active: boolean) =>
    [
      "inline-flex h-8 shrink-0 items-center rounded-md px-2 text-[11px] font-semibold transition-colors sm:h-9 sm:px-2.5 sm:text-xs",
      active
        ? "bg-[var(--sidebar-blue)] text-white shadow-sm"
        : "border border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-strong)] hover:bg-[var(--surface-hover)]",
    ].join(" ");

  return (
    <div className="no-print flex h-full min-h-[3.25rem] min-w-0 items-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1.5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] sm:px-3">
      <div className="flex min-w-0 w-full flex-wrap items-center gap-x-1.5 gap-y-1.5">
        <Link
          href={allHref}
          prefetch={false}
          className={[
            "inline-flex h-8 shrink-0 items-center rounded-md px-2 text-[11px] font-bold uppercase tracking-wide transition-colors sm:h-9 sm:px-2.5 sm:text-xs",
            allActive
              ? "bg-[var(--sidebar-blue)] text-white shadow-sm"
              : "border border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-strong)] hover:bg-[var(--surface-hover)]",
          ].join(" ")}
          title="Все наряды, без фильтра по лаб-сроку — как чипы в Заказах"
          aria-current={allActive ? "page" : undefined}
        >
          Все
        </Link>
        <Link
          href={actualHref}
          prefetch={false}
          className={[
            "inline-flex h-8 shrink-0 items-center rounded-md px-2 text-[11px] font-bold uppercase tracking-wide transition-colors sm:h-9 sm:px-2.5 sm:text-xs",
            actualActive
              ? "bg-[var(--sidebar-blue)] text-white shadow-sm"
              : "border border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-strong)] hover:bg-[var(--surface-hover)]",
          ].join(" ")}
          title="Непросчитанные наряды с лаб-сроком до завтра (включая прошлые), без ограничения по этапу воронки"
          aria-current={actualActive ? "page" : undefined}
        >
          Актуальное
        </Link>

        <span className="shrink-0 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] sm:text-[10px]">
          за период
        </span>

        <Link
          href={periodHref(defaultTo)}
          prefetch={false}
          className={dayBtn(todayActive)}
          title="Лаб-срок — сегодня (МСК)"
          aria-current={todayActive ? "page" : undefined}
        >
          Сегодня
        </Link>
        <Link
          href={periodHref(tomorrowYmd)}
          prefetch={false}
          className={dayBtn(tomorrowActive)}
          title="Лаб-срок — завтра (МСК)"
          aria-current={tomorrowActive ? "page" : undefined}
        >
          Завтра
        </Link>

        <form
          action="/finance-office"
          method="get"
          className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1.5"
        >
          <input type="hidden" name="tab" value="period" />
          {listTag ? <input type="hidden" name="tag" value={listTag} /> : null}
          {q?.trim() ? <input type="hidden" name="q" value={q.trim()} /> : null}
          <label className="sr-only" htmlFor="finance-office-from">
            Лаб-срок с
          </label>
          <input
            id="finance-office-from"
            name="from"
            type="date"
            className={dateInp}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            title="Лаб-срок с (необязательно)"
          />
          <label className="sr-only" htmlFor="finance-office-to">
            Лаб-срок по
          </label>
          <input
            id="finance-office-to"
            name="to"
            type="date"
            className={dateInp}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            title="Лаб-срок по"
            required
          />
          <button
            type="submit"
            className={[
              "h-8 shrink-0 rounded-md px-2 text-[11px] font-semibold text-white hover:opacity-95 sm:h-9 sm:px-2.5 sm:text-xs",
              periodActive
                ? "bg-[var(--sidebar-blue)] ring-2 ring-sky-400/60"
                : "bg-[var(--sidebar-blue)]",
            ].join(" ")}
          >
            Показать
          </button>
        </form>

        {listSummaryLine ? (
          <p className="min-w-0 flex-1 text-[11px] font-medium leading-snug text-[var(--text-body)] sm:text-xs md:text-sm">
            {listSummaryLine}
          </p>
        ) : null}
      </div>
    </div>
  );
}
