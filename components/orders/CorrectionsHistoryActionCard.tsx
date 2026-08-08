"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import {
  correctionHistoryRowFromJson,
  formatCorrectionHistoryAuthorDetail,
  formatCorrectionHistoryDecision,
  ordersHistoryHref,
  type CorrectionHistoryJsonRow,
} from "@/lib/corrections-history";
import { orderPathById } from "@/lib/order-public-ref";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { CorrectionOrderCompositionPanel } from "@/components/orders/CorrectionOrderCompositionPanel";

function correctionStatusClass(
  status: "pending" | "accepted" | "rejected" | "arrived",
): string {
  if (status === "accepted") {
    return "text-emerald-800 dark:text-emerald-200";
  }
  if (status === "rejected") {
    return "text-rose-800 dark:text-rose-200";
  }
  return "text-amber-800 dark:text-amber-200";
}

function cardShell(isHarmony: boolean, dense = false): string {
  if (dense) {
    return isHarmony
      ? "flex min-h-[3.25rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-1.5 py-1.5 text-center card-shadow transition hover:border-[var(--sidebar-blue)]/50"
      : "flex min-h-[3.25rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-1.5 py-1.5 text-center shadow-sm ring-1 ring-black/[0.04] transition hover:border-[var(--sidebar-blue)]/40 dark:ring-white/[0.06]";
  }
  return isHarmony
    ? "flex min-h-[4.75rem] w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-2.5 text-center card-shadow transition hover:border-[var(--sidebar-blue)]/50"
    : "flex min-h-[4.75rem] w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-2.5 text-center shadow-sm ring-1 ring-black/[0.04] transition hover:border-[var(--sidebar-blue)]/40 dark:ring-white/[0.06]";
}

export function CorrectionsHistoryActionCard({
  className = "",
  initialPendingCount = 0,
  dense = false,
  canAcceptCorrections = false,
}: {
  className?: string;
  initialPendingCount?: number;
  /** Компактная высота для шапки ФинОтдела. */
  dense?: boolean;
  /** Принять / отклонить корректировки (та же permission, что у панели в наряде). */
  canAcceptCorrections?: boolean;
}) {
  const isHarmony = useUiDesign() === "harmony";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CorrectionHistoryJsonRow[]>([]);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const saveCompositionRef = useRef<(() => Promise<boolean>) | null>(null);

  useEffect(() => {
    setPendingCount(initialPendingCount);
  }, [initialPendingCount]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 25_000);
    try {
      const res = await fetch("/api/order-chat-corrections/history", {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      });
      const j = (await res.json().catch(() => ({}))) as {
        items?: CorrectionHistoryJsonRow[];
        pendingCount?: number;
        error?: string;
      };
      if (!res.ok) {
        setErr(j.error ?? "Не удалось загрузить");
        return;
      }
      setItems(Array.isArray(j.items) ? j.items : []);
      if (typeof j.pendingCount === "number") {
        setPendingCount(j.pendingCount);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setErr("Превышено время ожидания. Попробуйте ещё раз.");
      } else {
        setErr("Сеть недоступна");
      }
    } finally {
      window.clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setExpandedId(null);
      saveCompositionRef.current = null;
      return;
    }
    void loadHistory();
  }, [open, loadHistory]);

  const removeRow = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((x) => x.id !== id));
      setPendingCount((n) => Math.max(0, n - 1));
      setExpandedId((cur) => (cur === id ? null : cur));
      saveCompositionRef.current = null;
      router.refresh();
    },
    [router],
  );

  const accept = useCallback(
    async (row: CorrectionHistoryJsonRow) => {
      if (!canAcceptCorrections || busyId) return;
      setBusyId(row.id);
      setErr(null);
      try {
        if (expandedId === row.id && saveCompositionRef.current) {
          const saved = await saveCompositionRef.current();
          if (!saved) return;
        }
        const res = await fetch(
          `/api/orders/${row.orderId}/chat-corrections/${row.id}/accept`,
          { method: "POST", credentials: "include" },
        );
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setErr(j.error ?? "Не удалось принять");
          return;
        }
        removeRow(row.id);
      } catch {
        setErr("Сеть недоступна");
      } finally {
        setBusyId(null);
      }
    },
    [busyId, canAcceptCorrections, expandedId, removeRow],
  );

  const reject = useCallback(
    async (row: CorrectionHistoryJsonRow) => {
      if (!canAcceptCorrections || busyId) return;
      setBusyId(row.id);
      setErr(null);
      try {
        const res = await fetch(
          `/api/orders/${row.orderId}/chat-corrections/${row.id}/reject`,
          { method: "POST", credentials: "include" },
        );
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setErr(j.error ?? "Не удалось отклонить");
          return;
        }
        removeRow(row.id);
      } catch {
        setErr("Сеть недоступна");
      } finally {
        setBusyId(null);
      }
    },
    [busyId, canAcceptCorrections, removeRow],
  );

  const onPanelError = useCallback((message: string) => {
    setErr(message.trim() ? message : null);
  }, []);

  const registerSave = useCallback((fn: (() => Promise<boolean>) | null) => {
    saveCompositionRef.current = fn;
  }, []);

  return (
    <>
      <button
        type="button"
        className={`${cardShell(isHarmony, dense)} ${className}`.trim()}
        onClick={() => setOpen(true)}
      >
        <span
          className={
            dense
              ? "text-[10px] font-bold uppercase leading-tight tracking-wide text-orange-500 dark:text-orange-400 sm:text-[11px]"
              : "text-[11px] font-bold uppercase leading-tight tracking-wide text-orange-500 dark:text-orange-400 sm:text-xs"
          }
        >
          Корректировки
        </span>
        <span className="flex items-center justify-center gap-1.5 sm:gap-2">
          <span
            className={
              dense
                ? "text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] sm:text-xs"
                : "text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]"
            }
          >
            Непринятые
          </span>
          <span
            className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white"
            aria-label={`Непринятые: ${pendingCount}`}
          >
            {pendingCount}
          </span>
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Корректировки"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
              <h2 className="text-base font-semibold text-orange-500 dark:text-orange-400">
                Корректировки
              </h2>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                onClick={() => setOpen(false)}
              >
                Закрыть
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
              {err ? (
                <p className="mb-2 text-sm text-red-600" role="alert">
                  {err}
                </p>
              ) : null}
              {loading ? (
                <p className="text-sm text-[var(--text-muted)]">Загрузка…</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  Нет корректировок со статусом «Ожидает».
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map((row) => {
                    const historyRow = correctionHistoryRowFromJson(row);
                    const decision = formatCorrectionHistoryDecision(historyRow);
                    const authorDetail =
                      formatCorrectionHistoryAuthorDetail(historyRow);
                    const doctorName = row.doctorName
                      ? personNameSurnameInitials(row.doctorName)
                      : null;
                    const patientName = row.patientName
                      ? personNameSurnameInitials(row.patientName)
                      : null;
                    const expanded = expandedId === row.id;

                    return (
                      <li
                        key={row.id}
                        className="min-w-0 overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)]/50 px-3 py-2"
                      >
                        <div
                          className="flex cursor-pointer items-start justify-between gap-3"
                          role="button"
                          tabIndex={0}
                          aria-expanded={expanded}
                          onClick={() =>
                            setExpandedId((cur) =>
                              cur === row.id ? null : row.id,
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setExpandedId((cur) =>
                                cur === row.id ? null : row.id,
                              );
                            }
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                              <Link
                                href={orderPathById(row.orderId)}
                                className="font-mono text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpen(false);
                                }}
                              >
                                {row.orderNumber}
                              </Link>
                              {doctorName ? (
                                <span className="text-sm font-semibold text-[var(--app-text)]">
                                  {doctorName}
                                </span>
                              ) : null}
                              {doctorName && patientName ? (
                                <span className="text-[var(--text-muted)]">
                                  ·
                                </span>
                              ) : null}
                              {patientName ? (
                                <span className="text-sm font-semibold text-[var(--app-text)]">
                                  {patientName}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                              <span className="font-medium text-[var(--text-muted)]">
                                От кого и когда:{" "}
                              </span>
                              {authorDetail}
                            </p>
                            {decision.detail ? (
                              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                                <span className="font-medium text-[var(--text-muted)]">
                                  Кем и когда:{" "}
                                </span>
                                {decision.detail}
                              </p>
                            ) : null}
                            <p className="mt-1 min-w-0 whitespace-pre-wrap break-words text-sm text-[var(--text-body)]">
                              {row.text}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <span
                              className={`text-xs font-semibold uppercase tracking-wide ${correctionStatusClass(decision.status)}`}
                            >
                              {decision.label}
                            </span>
                            {canAcceptCorrections ? (
                              <div className="flex flex-wrap justify-end gap-1">
                                <button
                                  type="button"
                                  className="rounded-md border border-emerald-400/90 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-950 hover:bg-emerald-200 disabled:opacity-50 dark:border-emerald-700/80 dark:bg-emerald-950/50 dark:text-emerald-100"
                                  disabled={busyId === row.id}
                                  title="Принять корректировку"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void accept(row);
                                  }}
                                >
                                  {busyId === row.id ? "…" : "Принять"}
                                </button>
                                <button
                                  type="button"
                                  className="rounded-md border border-rose-300/80 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-800 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-200"
                                  disabled={busyId === row.id}
                                  title="Отклонить корректировку"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void reject(row);
                                  }}
                                >
                                  {busyId === row.id ? "…" : "Отклонить"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {expanded ? (
                          <CorrectionOrderCompositionPanel
                            orderId={row.orderId}
                            canEdit={canAcceptCorrections}
                            busy={busyId === row.id}
                            onError={onPanelError}
                            registerSave={registerSave}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="border-t border-[var(--card-border)] px-4 py-2 text-right">
              <Link
                href={ordersHistoryHref({ tab: "corrections" })}
                className="text-xs font-medium text-[var(--sidebar-blue)] hover:underline"
                onClick={() => setOpen(false)}
              >
                Вся история корректировок →
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
