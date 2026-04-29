"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ORDERS_LIST_PAGE_SIZE_MAX,
  ORDERS_LIST_PAGE_SIZE_MIN,
} from "@/lib/orders-list-cursor";
import { ordersListHref } from "@/lib/orders-list-query";

type Props = {
  savedInProfile: number | null;
  effectivePageSize: number;
  tag?: string | null;
  hideShipped: boolean;
  onlyShipped: boolean;
  q?: string | null;
  from?: string | null;
  to?: string | null;
  /** Компактная строка рядом с «К началу списка» / «Следующие N». */
  paginationBar?: boolean;
};

export function OrdersListPageSizePref({
  savedInProfile,
  effectivePageSize,
  tag,
  hideShipped,
  onlyShipped,
  q,
  from,
  to,
  paginationBar = false,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(String(effectivePageSize));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const hrefBase = useMemo(
    () =>
      ordersListHref({
        tag: tag ?? undefined,
        hideShipped,
        onlyShipped,
        q: q ?? undefined,
        from: from ?? undefined,
        to: to ?? undefined,
      }),
    [tag, hideShipped, onlyShipped, q, from, to],
  );

  useEffect(() => {
    setDraft(String(effectivePageSize));
  }, [effectivePageSize]);

  const save = useCallback(async () => {
    setErr(null);
    setOk(null);
    const n = Math.floor(Number(String(draft).replace(",", ".").trim()));
    if (!Number.isFinite(n)) {
      setErr("Введите число.");
      return;
    }
    if (n < ORDERS_LIST_PAGE_SIZE_MIN || n > ORDERS_LIST_PAGE_SIZE_MAX) {
      setErr(`Допустимо от ${ORDERS_LIST_PAGE_SIZE_MIN} до ${ORDERS_LIST_PAGE_SIZE_MAX}.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordersListPageSize: n }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Не удалось сохранить");
        return;
      }
      setOk("Сохранено");
      router.push(hrefBase);
      router.refresh();
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }, [draft, hrefBase, router]);

  const resetSaved = useCallback(async () => {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordersListPageSize: null }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Не удалось сбросить");
        return;
      }
      setOk("Используется размер по умолчанию");
      router.push(hrefBase);
      router.refresh();
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }, [hrefBase, router]);

  const rootClass = paginationBar
    ? "no-print flex w-full min-w-0 max-w-full flex-col gap-1 text-sm"
    : "no-print flex w-full flex-col gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] sm:px-4";

  const rowClass = paginationBar
    ? "flex w-full min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1.5"
    : "flex flex-wrap items-end gap-2 sm:items-center sm:gap-3";

  const labelClass = paginationBar
    ? "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
    : "flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2";

  return (
    <div className={rootClass}>
      <div className={rowClass}>
        <label className={labelClass}>
          <span className="shrink-0 font-medium text-[var(--text-body)]">
            Нарядов на странице
          </span>
          <input
            type="number"
            min={ORDERS_LIST_PAGE_SIZE_MIN}
            max={ORDERS_LIST_PAGE_SIZE_MAX}
            step={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-8 w-[4.25rem] rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 font-mono text-sm text-[var(--app-text)] tabular-nums"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="h-8 shrink-0 rounded-md bg-[var(--sidebar-blue)] px-3 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50"
        >
          {busy ? "…" : "Сохранить"}
        </button>
        {savedInProfile != null ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void resetSaved()}
            className="h-8 shrink-0 rounded-md border border-[var(--card-border)] px-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            Сбросить сохранённое
          </button>
        ) : null}
      </div>
      {err ? (
        <p
          className={`text-xs text-red-600 dark:text-red-400${paginationBar ? " max-w-full" : ""}`}
        >
          {err}
        </p>
      ) : null}
      {ok ? (
        <p
          className={`text-xs text-emerald-700 dark:text-emerald-400${paginationBar ? " max-w-full" : ""}`}
        >
          {ok}
        </p>
      ) : null}
    </div>
  );
}
