"use client";

import { useCallback, useEffect, useState } from "react";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import {
  ReconciliationPeriodRows,
  type ReconRowVm,
} from "@/components/finance-office/ReconciliationPeriodRows";

function cardShell(isHarmony: boolean): string {
  return isHarmony
    ? "flex h-full min-h-[3.25rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-1.5 py-1.5 text-center card-shadow transition hover:border-[var(--sidebar-blue)]/50"
    : "flex h-full min-h-[3.25rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-1.5 py-1.5 text-center shadow-sm ring-1 ring-black/[0.04] transition hover:border-[var(--sidebar-blue)]/40 dark:ring-white/[0.06]";
}

export function FinanceOfficeReconciliationsCard({
  className = "",
  initialHighlightCount = 0,
  canEdit = true,
}: {
  className?: string;
  initialHighlightCount?: number;
  canEdit?: boolean;
}) {
  const isHarmony = useUiDesign() === "harmony";
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"open" | "archive">("open");
  const [count, setCount] = useState(initialHighlightCount);
  const [items, setItems] = useState<ReconRowVm[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setCount(initialHighlightCount);
  }, [initialHighlightCount]);

  const load = useCallback(async (which: "open" | "archive") => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/finance-office/reconciliations?tab=${which}`,
        { credentials: "include", cache: "no-store" },
      );
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        items?: ReconRowVm[];
        highlightCount?: number;
      };
      if (!res.ok) {
        setErr(typeof j.error === "string" ? j.error : "Не удалось загрузить");
        return;
      }
      setItems(Array.isArray(j.items) ? j.items : []);
      if (which === "open" && typeof j.highlightCount === "number") {
        setCount(j.highlightCount);
      }
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load(tab);
  }, [open, tab, load]);

  return (
    <>
      <button
        type="button"
        className={`${cardShell(isHarmony)} ${className}`.trim()}
        onClick={() => setOpen(true)}
      >
        <span className="text-[10px] font-bold uppercase leading-tight tracking-wide text-sky-700 dark:text-sky-300 sm:text-[11px]">
          Сверки
        </span>
        <span className="flex items-center justify-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] sm:text-xs">
            Готовы
          </span>
          <span
            className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-sky-600 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white"
            aria-label={`Сверок готовы: ${count}`}
          >
            {count}
          </span>
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Сверки"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
              <h2 className="text-base font-semibold text-[var(--app-text)]">
                Сверки
              </h2>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                onClick={() => setOpen(false)}
              >
                Закрыть
              </button>
            </div>
            <div className="flex gap-2 border-b border-[var(--card-border)] px-4 pt-2">
              <button
                type="button"
                className={[
                  "border-b-2 px-2 pb-2 text-sm font-semibold",
                  tab === "open"
                    ? "border-[var(--sidebar-blue)] text-[var(--app-text)]"
                    : "border-transparent text-[var(--text-secondary)]",
                ].join(" ")}
                onClick={() => setTab("open")}
              >
                Текущие
              </button>
              <button
                type="button"
                className={[
                  "border-b-2 px-2 pb-2 text-sm font-semibold",
                  tab === "archive"
                    ? "border-[var(--sidebar-blue)] text-[var(--app-text)]"
                    : "border-transparent text-[var(--text-secondary)]",
                ].join(" ")}
                onClick={() => setTab("archive")}
              >
                Архивные
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
              {err ? (
                <p className="mb-2 text-sm text-red-600" role="alert">
                  {err}
                </p>
              ) : null}
              {loading ? (
                <p className="text-sm text-[var(--text-muted)]">Загрузка…</p>
              ) : (
                <ReconciliationPeriodRows
                  items={items}
                  archive={tab === "archive"}
                  canEdit={canEdit}
                  downloadHref={(row, lockPeriod, period) => {
                    const q = new URLSearchParams({
                      groupKey: row.groupKey,
                      from: period.from,
                      to: period.to,
                      slot: period.slot,
                      clinicIds: row.clinicIds.join(","),
                      title: row.legalEntityLabel,
                    });
                    if (lockPeriod) q.set("lockPeriod", "1");
                    return `/api/finance-office/reconciliations/download?${q.toString()}`;
                  }}
                  onChanged={() => void load(tab)}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
