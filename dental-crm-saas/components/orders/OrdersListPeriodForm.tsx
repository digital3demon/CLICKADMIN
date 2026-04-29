"use client";

import {
  normalizeOrdersSearchQuery,
  ordersListHref,
} from "@/lib/orders-list-query";
import { ordersListPeriodDefaultDraft } from "@/lib/orders-list-period";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  pageSize: number;
  /** Даты из URL (после «Показать»); null — в полях черновик по умолчанию. */
  appliedFrom: string | null;
  appliedTo: string | null;
  className?: string;
};

export function OrdersListPeriodForm({
  pageSize,
  appliedFrom,
  appliedTo,
  className = "",
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const defaultDraft = useMemo(() => ordersListPeriodDefaultDraft(), []);
  const [from, setFrom] = useState(() => appliedFrom ?? defaultDraft.from);
  const [to, setTo] = useState(() => appliedTo ?? defaultDraft.to);

  useEffect(() => {
    setFrom(appliedFrom ?? defaultDraft.from);
    setTo(appliedTo ?? defaultDraft.to);
  }, [appliedFrom, appliedTo, defaultDraft.from, defaultDraft.to]);

  const buildHref = useCallback(
    (nextFrom: string, nextTo: string) => {
      const tag = sp.get("tag")?.trim() || undefined;
      const onlyShipped =
        sp.get("onlyShipped") === "1" || sp.get("onlyShipped") === "true";
      const hideShipped =
        !onlyShipped &&
        (sp.get("hideShipped") === "1" || sp.get("hideShipped") === "true");
      const q = normalizeOrdersSearchQuery(sp.get("q")) || undefined;
      const f = nextFrom.trim();
      const t = nextTo.trim();
      return ordersListHref({
        limit: pageSize,
        tag,
        hideShipped: hideShipped || undefined,
        onlyShipped: onlyShipped || undefined,
        q,
        from: f || undefined,
        to: t || undefined,
      });
    },
    [pageSize, sp],
  );

  const apply = useCallback(() => {
    router.push(buildHref(from, to));
  }, [router, buildHref, from, to]);

  const clearPeriod = useCallback(() => {
    const tag = sp.get("tag")?.trim() || undefined;
    const onlyShipped =
      sp.get("onlyShipped") === "1" || sp.get("onlyShipped") === "true";
    const hideShipped =
      !onlyShipped &&
      (sp.get("hideShipped") === "1" || sp.get("hideShipped") === "true");
    const q = normalizeOrdersSearchQuery(sp.get("q")) || undefined;
    router.push(
      ordersListHref({
        limit: pageSize,
        tag,
        hideShipped: hideShipped || undefined,
        onlyShipped: onlyShipped || undefined,
        q,
      }),
    );
  }, [router, pageSize, sp]);

  const periodActive = Boolean(appliedFrom?.trim() || appliedTo?.trim());

  const dateInp =
    "h-9 w-[9.5rem] max-w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-1.5 py-1 text-sm text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-[10rem]";

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2.5 gap-y-2 ${className}`.trim()}
    >
      <div className="flex shrink-0 items-center gap-2">
        <label
          htmlFor="orders-period-from"
          className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]"
          title="Создан с (МСК)"
        >
          С (МСК)
        </label>
        <input
          id="orders-period-from"
          type="date"
          className={dateInp}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <label
          htmlFor="orders-period-to"
          className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]"
          title="Создан по (МСК)"
        >
          По (МСК)
        </label>
        <input
          id="orders-period-to"
          type="date"
          className={dateInp}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <button
        type="button"
        title="Показать за выбранный период (дата создания наряда, МСК)"
        className="h-9 shrink-0 rounded-md bg-[var(--sidebar-blue)] px-3 text-xs font-semibold text-white hover:opacity-95 sm:px-3.5 sm:text-sm"
        onClick={() => apply()}
      >
        Показать
      </button>
      {periodActive ? (
        <button
          type="button"
          title="Убрать фильтр по дате создания"
          className="h-9 shrink-0 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)] sm:text-sm"
          onClick={() => clearPeriod()}
        >
          Все даты
        </button>
      ) : null}
    </div>
  );
}
