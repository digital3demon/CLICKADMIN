"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { financeOfficeListHref } from "@/lib/finance-office-list-query";
import { moscowTodayYmd } from "@/lib/shipments-date-range";
import type { FinanceOfficeMode } from "@/lib/finance-office-list-filter";

export type { FinanceOfficeMode };

/**
 * Макет как у отгрузок: Актуальное · за период · даты · Показать.
 */
export function FinanceOfficeModePanel({
  mode,
  appliedFrom,
  appliedTo,
  listTag = null,
  q = "",
}: {
  mode: FinanceOfficeMode;
  appliedFrom: string | null;
  appliedTo: string | null;
  listTag?: string | null;
  q?: string | null;
}) {
  const router = useRouter();
  const defaultTo = useMemo(() => moscowTodayYmd(), []);
  const [from, setFrom] = useState(() => appliedFrom ?? "");
  const [to, setTo] = useState(() => appliedTo ?? defaultTo);

  useEffect(() => {
    setFrom(appliedFrom ?? "");
    setTo(appliedTo ?? defaultTo);
  }, [appliedFrom, appliedTo, defaultTo]);

  const common = useCallback(
    () => ({
      tag: listTag,
      q: q?.trim() || undefined,
    }),
    [listTag, q],
  );

  const applyActual = useCallback(() => {
    router.push(
      financeOfficeListHref({
        ...common(),
        tab: "actual",
      }),
    );
  }, [router, common]);

  const applyPeriod = useCallback(() => {
    const toTrim = to.trim();
    if (!toTrim) return;
    router.push(
      financeOfficeListHref({
        ...common(),
        tab: "period",
        from: from.trim() || undefined,
        to: toTrim,
      }),
    );
  }, [router, common, from, to]);

  const dateInp =
    "h-8 w-[6.75rem] min-w-0 max-w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-1 py-0.5 text-[11px] text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:h-9 sm:w-[7.5rem] sm:text-xs";

  const actualActive = mode === "actual";
  const periodActive = mode === "period";

  return (
    <div className="no-print flex h-full min-h-[3.25rem] min-w-0 items-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1.5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] sm:px-3 sm:py-2">
      <div className="flex min-w-0 w-full flex-wrap items-center gap-x-1.5 gap-y-1.5">
        <button
          type="button"
          onClick={applyActual}
          className={[
            "h-8 shrink-0 rounded-md px-2 text-[11px] font-bold uppercase tracking-wide transition-colors sm:h-9 sm:px-2.5 sm:text-xs",
            actualActive
              ? "bg-[var(--sidebar-blue)] text-white shadow-sm"
              : "border border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-strong)] hover:bg-[var(--surface-hover)]",
          ].join(" ")}
          title="Непросчитанные наряды с датой записи до завтра (включая прошлые периоды), начиная с этапа «Производство»"
        >
          Актуальное
        </button>

        <span className="shrink-0 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] sm:text-[10px]">
          за период
        </span>

        <label className="sr-only" htmlFor="finance-office-from">
          Дата с
        </label>
        <input
          id="finance-office-from"
          type="date"
          className={dateInp}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          title="Дата записи с (необязательно)"
        />
        <label className="sr-only" htmlFor="finance-office-to">
          Дата по
        </label>
        <input
          id="finance-office-to"
          type="date"
          className={dateInp}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          title="Дата записи по"
        />
        <button
          type="button"
          onClick={applyPeriod}
          className={[
            "h-8 shrink-0 rounded-md px-2 text-[11px] font-semibold text-white hover:opacity-95 sm:h-9 sm:px-2.5 sm:text-xs",
            periodActive
              ? "bg-[var(--sidebar-blue)] ring-2 ring-sky-400/60"
              : "bg-[var(--sidebar-blue)]",
          ].join(" ")}
        >
          Показать
        </button>
      </div>
    </div>
  );
}
