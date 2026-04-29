"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function ShipmentsPeriodForm({
  appliedFrom,
  appliedTo,
  defaultFrom,
  defaultTo,
  /** Строка справки про окно приёма (МСК) — рядом с «Показать», когда список уже загружен. */
  receptionSummary = null,
}: {
  /** Даты из URL после «Показать»; null — форма показывает черновик по умолчанию. */
  appliedFrom: string | null;
  appliedTo: string | null;
  defaultFrom: string;
  defaultTo: string;
  receptionSummary?: string | null;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(
    () => appliedFrom ?? defaultFrom,
  );
  const [to, setTo] = useState(() => appliedTo ?? defaultTo);

  useEffect(() => {
    setFrom(appliedFrom ?? defaultFrom);
    setTo(appliedTo ?? defaultTo);
  }, [appliedFrom, appliedTo, defaultFrom, defaultTo]);

  const apply = useCallback(() => {
    const q = new URLSearchParams();
    q.set("tab", "period");
    if (from.trim()) q.set("from", from.trim());
    if (to.trim()) q.set("to", to.trim());
    router.push(`/shipments?${q.toString()}`);
  }, [from, to, router]);

  const dateInp =
    "h-9 min-w-0 flex-1 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-sm text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-[10.5rem] sm:flex-none";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:min-w-[12rem] sm:flex-none">
        <label
          htmlFor="ship-from"
          className="shrink-0 whitespace-nowrap text-xs font-medium text-[var(--text-secondary)]"
        >
          Дата с
        </label>
        <input
          id="ship-from"
          type="date"
          className={dateInp}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:min-w-[12rem] sm:flex-none">
        <label
          htmlFor="ship-to"
          className="shrink-0 whitespace-nowrap text-xs font-medium text-[var(--text-secondary)]"
        >
          Дата по
        </label>
        <input
          id="ship-to"
          type="date"
          className={dateInp}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 sm:w-auto sm:max-w-none sm:flex-1 sm:justify-end lg:justify-start">
        <button
          type="button"
          className="h-9 shrink-0 rounded-md bg-[var(--sidebar-blue)] px-4 text-sm font-semibold text-white hover:opacity-95"
          onClick={() => apply()}
        >
          Показать
        </button>
        {receptionSummary ? (
          <p className="min-w-0 max-w-full text-sm font-medium leading-snug text-[var(--text-body)] sm:max-w-[min(100%,42rem)]">
            {receptionSummary}
          </p>
        ) : null}
      </div>
    </div>
  );
}
