"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import {
  formatCorrectionHistoryAuthorDetail,
  formatRuDateTime,
  ordersHistoryHref,
} from "@/lib/corrections-history";
import type {
  ProstheticsInTransitRow,
  ProstheticsInTransitStep,
  ProstheticsToOrderRow,
} from "@/lib/prosthetics-in-transit";
import type { ProstheticsProgressStep } from "@/lib/prosthetics-in-transit-step";
import { orderPathById } from "@/lib/order-public-ref";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { formatProstheticsRequestTextForDisplay } from "@/lib/order-prosthetics-request";
import { printOrderSticker } from "@/lib/print-order-sticker";
import { CorrectionsHistoryActionCard } from "@/components/orders/CorrectionsHistoryActionCard";
import { LabTasksActionCard } from "@/components/orders/LabTasksActionCard";
import { ProstheticsWarehouseEditPanel } from "@/components/orders/ProstheticsWarehouseEditPanel";

/** Единый список: pending (step=null) или в пути. */
type UnifiedProstheticsRow = {
  id: string;
  text: string;
  authorLabel: string | null;
  createdAt: string;
  resolvedAt: string | null;
  orderId: string;
  orderNumber: string;
  patientName: string | null;
  doctorName: string | null;
  /** null — ещё не подтверждена («Подтвердил» + «Отказать»). */
  step: ProstheticsInTransitStep | null;
};

function cardShell(isHarmony: boolean): string {
  return isHarmony
    ? "flex min-h-[4.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-2 text-center card-shadow transition hover:border-[var(--sidebar-blue)]/50"
    : "flex min-h-[4.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-2 text-center shadow-sm ring-1 ring-black/[0.04] transition hover:border-[var(--sidebar-blue)]/40 dark:ring-white/[0.06]";
}

/** Подпись следующей кнопки: Подтвердил → Заказал → Пришла → Проверил → Готово. */
function primaryActionLabel(step: ProstheticsInTransitStep | null): string {
  if (step == null) return "Подтвердил";
  if (step === "confirmed") return "Заказал";
  if (step === "ordered") return "Пришла";
  if (step === "arrived") return "Проверил";
  if (step === "checked") return "Готово";
  return "Готово";
}

function primaryActionClass(step: ProstheticsInTransitStep | null): string {
  const base =
    "rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide disabled:opacity-50";
  if (step == null) {
    /* Подтвердил — синий */
    return `${base} border-sky-400/90 bg-sky-100 text-sky-950 hover:bg-sky-200 dark:border-sky-700/80 dark:bg-sky-950/50 dark:text-sky-100`;
  }
  if (step === "confirmed") {
    /* Заказал — янтарный */
    return `${base} border-amber-400/90 bg-amber-100 text-amber-950 hover:bg-amber-200 dark:border-amber-700/80 dark:bg-amber-950/50 dark:text-amber-100`;
  }
  if (step === "ordered") {
    /* Пришла — фиолетовый */
    return `${base} border-violet-400/90 bg-violet-100 text-violet-950 hover:bg-violet-200 dark:border-violet-700/80 dark:bg-violet-950/50 dark:text-violet-100`;
  }
  if (step === "arrived") {
    /* Проверил — изумрудный */
    return `${base} border-emerald-400/90 bg-emerald-100 text-emerald-950 hover:bg-emerald-200 dark:border-emerald-700/80 dark:bg-emerald-950/50 dark:text-emerald-100`;
  }
  /* Готово — лайм */
  return `${base} border-lime-500/90 bg-lime-100 text-lime-950 hover:bg-lime-200 dark:border-lime-700/80 dark:bg-lime-950/50 dark:text-lime-100`;
}

function stickerActionClass(): string {
  return "rounded-md border border-teal-400/90 bg-teal-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-teal-950 hover:bg-teal-200 disabled:opacity-50 dark:border-teal-700/80 dark:bg-teal-950/50 dark:text-teal-100";
}

function toUnifiedFromPending(row: ProstheticsToOrderRow): UnifiedProstheticsRow {
  return {
    id: row.id,
    text: row.text,
    authorLabel: row.authorLabel,
    createdAt: row.createdAt,
    resolvedAt: null,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    patientName: row.patientName,
    doctorName: row.doctorName,
    step: null,
  };
}

function toUnifiedFromTransit(row: ProstheticsInTransitRow): UnifiedProstheticsRow {
  return {
    id: row.id,
    text: row.text,
    authorLabel: row.authorLabel,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    patientName: row.patientName,
    doctorName: row.doctorName,
    step: row.step ?? "confirmed",
  };
}

export function OrdersListHeaderActionCards({
  initialInTransitCount,
  initialToOrderCount = 0,
  initialCorrectionsPendingCount = 0,
  initialTasksPendingCount = 0,
  initialPickupsPendingCount = 0,
  canMarkArrived = false,
  canResolveTasks = false,
  showProstheticsBlock = true,
  canAcceptCorrections = false,
}: {
  initialInTransitCount: number;
  /** Непринятые заявки «???» — счётчик «Заказать». */
  initialToOrderCount?: number;
  initialCorrectionsPendingCount?: number;
  initialTasksPendingCount?: number;
  initialPickupsPendingCount?: number;
  canMarkArrived?: boolean;
  canResolveTasks?: boolean;
  /** Скрыть блок «Заказы протетики», если у роли нет права на эти уведомления. */
  showProstheticsBlock?: boolean;
  canAcceptCorrections?: boolean;
}) {
  const isHarmony = useUiDesign() === "harmony";
  const router = useRouter();
  const [inTransitCount, setInTransitCount] = useState(initialInTransitCount);
  const [toOrderCount, setToOrderCount] = useState(initialToOrderCount);
  const [prostheticsOpen, setProstheticsOpen] = useState(false);
  const [items, setItems] = useState<UnifiedProstheticsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const saveProstheticsRef = useRef<(() => Promise<boolean>) | null>(null);
  const loadInflightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    setInTransitCount(initialInTransitCount);
  }, [initialInTransitCount]);

  useEffect(() => {
    setToOrderCount(initialToOrderCount);
  }, [initialToOrderCount]);

  const loadAll = useCallback(async (opts?: { background?: boolean }) => {
    const background = opts?.background === true;
    if (!background) setLoading(true);
    setErr(null);
    try {
      if (!loadInflightRef.current) {
        loadInflightRef.current = (async () => {
          const res = await fetch("/api/order-prosthetics-requests/open", {
            credentials: "include",
            cache: "no-store",
          });
          const j = (await res.json().catch(() => ({}))) as {
            toOrderCount?: number;
            inTransitCount?: number;
            toOrder?: ProstheticsToOrderRow[];
            inTransit?: ProstheticsInTransitRow[];
            error?: string;
          };
          if (!res.ok) {
            throw new Error(j.error ?? "Не удалось загрузить заказы протетики");
          }
          const pending = Array.isArray(j.toOrder) ? j.toOrder : [];
          const transit = Array.isArray(j.inTransit) ? j.inTransit : [];
          const merged = [
            ...pending.map(toUnifiedFromPending),
            ...transit.map(toUnifiedFromTransit),
          ].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          setItems(merged);
          setToOrderCount(
            typeof j.toOrderCount === "number" ? j.toOrderCount : pending.length,
          );
          setInTransitCount(
            typeof j.inTransitCount === "number"
              ? j.inTransitCount
              : transit.length,
          );
        })().finally(() => {
          loadInflightRef.current = null;
        });
      }
      await loadInflightRef.current;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Сеть недоступна");
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  const prefetchProsthetics = useCallback(() => {
    if (prostheticsOpen) return;
    void loadAll({ background: true });
  }, [prostheticsOpen, loadAll]);

  useEffect(() => {
    if (!prostheticsOpen) {
      setExpandedId(null);
      return;
    }
    /* Уже есть кэш с prefetch — тихо обновить; иначе полный спиннер. */
    void loadAll({ background: items.length > 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, [prostheticsOpen]);

  const onPanelError = useCallback((message: string) => {
    setErr(message.trim() ? message : null);
  }, []);

  const registerSave = useCallback((fn: (() => Promise<boolean>) | null) => {
    saveProstheticsRef.current = fn;
  }, []);

  const rejectRow = useCallback(
    async (row: UnifiedProstheticsRow) => {
      if (!canMarkArrived || row.step != null) return;
      setBusyId(row.id);
      setErr(null);
      try {
        const res = await fetch(
          `/api/orders/${row.orderId}/prosthetics-requests/${row.id}/reject`,
          { method: "POST", credentials: "include" },
        );
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setErr(j.error ?? "Не удалось отклонить");
          return;
        }
        setItems((prev) => prev.filter((x) => x.id !== row.id));
        setToOrderCount((n) => Math.max(0, n - 1));
        setExpandedId(null);
        router.refresh();
      } catch {
        setErr("Сеть недоступна");
      } finally {
        setBusyId(null);
      }
    },
    [canMarkArrived, router],
  );

  const advancePrimary = useCallback(
    async (row: UnifiedProstheticsRow, opts?: { printSticker?: boolean }) => {
      if (!canMarkArrived) return;
      setBusyId(row.id);
      setErr(null);
      try {
        /* Уже «Готово» на сервере — убрать из списка. */
        if (row.step === "done") {
          setItems((prev) => prev.filter((x) => x.id !== row.id));
          setInTransitCount((n) => Math.max(0, n - 1));
          setExpandedId((cur) => (cur === row.id ? null : cur));
          return;
        }

        if (row.step == null) {
          if (expandedId === row.id && saveProstheticsRef.current) {
            const saved = await saveProstheticsRef.current();
            if (!saved) return;
          }
          const res = await fetch(
            `/api/orders/${row.orderId}/prosthetics-requests/${row.id}/accept`,
            { method: "POST", credentials: "include" },
          );
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) {
            setErr(j.error ?? "Не удалось подтвердить");
            return;
          }
          const now = new Date().toISOString();
          setItems((prev) =>
            prev.map((x) =>
              x.id === row.id
                ? { ...x, step: "confirmed", resolvedAt: now }
                : x,
            ),
          );
          setToOrderCount((n) => Math.max(0, n - 1));
          setInTransitCount((n) => n + 1);
          router.refresh();
          return;
        }

        let progress: ProstheticsProgressStep | null = null;
        if (row.step === "confirmed") progress = "ordered";
        else if (row.step === "ordered") progress = "arrived";
        else if (row.step === "arrived") progress = "checked";
        else if (row.step === "checked") progress = "completed";
        if (!progress) return;

        const res = await fetch(
          `/api/orders/${row.orderId}/prosthetics-requests/${row.id}/progress`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step: progress }),
          },
        );
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setErr(j.error ?? "Не удалось обновить статус");
          return;
        }

        if (progress === "completed") {
          setItems((prev) => prev.filter((x) => x.id !== row.id));
          setInTransitCount((n) => Math.max(0, n - 1));
        } else if (progress === "ordered") {
          setItems((prev) =>
            prev.map((x) =>
              x.id === row.id ? { ...x, step: "ordered" } : x,
            ),
          );
        } else if (progress === "arrived") {
          setItems((prev) =>
            prev.map((x) =>
              x.id === row.id ? { ...x, step: "arrived" } : x,
            ),
          );
        } else if (progress === "checked") {
          setItems((prev) =>
            prev.map((x) =>
              x.id === row.id ? { ...x, step: "checked" } : x,
            ),
          );
          if (opts?.printSticker) {
            printOrderSticker(row.orderId);
          }
        }
        router.refresh();
      } catch {
        setErr("Сеть недоступна");
      } finally {
        setBusyId(null);
      }
    },
    [canMarkArrived, expandedId, router],
  );

  const empty = useMemo(() => !loading && items.length === 0, [loading, items]);

  return (
    <>
      <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:max-w-[36rem] xl:max-w-[42rem]">
        {showProstheticsBlock ? (
          <button
            type="button"
            className={cardShell(isHarmony)}
            onClick={() => setProstheticsOpen(true)}
            onMouseEnter={prefetchProsthetics}
            onFocus={prefetchProsthetics}
            title="Заказы протетики"
          >
            <span className="text-[11px] font-bold uppercase leading-tight tracking-wide text-[var(--sidebar-blue)] sm:text-xs">
              Заказы протетики
            </span>
            <span className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] sm:text-xs">
                  Заказать
                </span>
                <span
                  className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white"
                  aria-label={`Заказать: ${toOrderCount}`}
                >
                  {toOrderCount}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] sm:text-xs">
                  В пути
                </span>
                <span
                  className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-zinc-500 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white dark:bg-zinc-600"
                  aria-label={`В пути: ${inTransitCount}`}
                >
                  {inTransitCount}
                </span>
              </span>
            </span>
          </button>
        ) : null}

        <CorrectionsHistoryActionCard
          className="flex-1"
          initialPendingCount={initialCorrectionsPendingCount}
          canAcceptCorrections={canAcceptCorrections}
        />
        <LabTasksActionCard
          className="flex-1"
          kind="TASK"
          initialPendingCount={initialTasksPendingCount}
          canResolve={canResolveTasks}
        />
        <LabTasksActionCard
          className="flex-1"
          kind="PICKUP_FROM"
          initialPendingCount={initialPickupsPendingCount}
          canResolve={canResolveTasks}
        />
      </div>

      {showProstheticsBlock && prostheticsOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Заказы протетики"
          onClick={() => setProstheticsOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
              <h2 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base font-semibold text-[var(--app-text)]">
                <span>Заказы протетики</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Заказать
                  <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                    {toOrderCount}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  В пути
                  <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-zinc-500 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white dark:bg-zinc-600">
                    {inTransitCount}
                  </span>
                </span>
              </h2>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                onClick={() => setProstheticsOpen(false)}
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
              ) : empty ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  Нет открытых заявок по протетике.
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map((row) => {
                    const doctorName = row.doctorName
                      ? personNameSurnameInitials(row.doctorName)
                      : null;
                    const patientName = row.patientName
                      ? personNameSurnameInitials(row.patientName)
                      : null;
                    const authorDetail = formatCorrectionHistoryAuthorDetail({
                      authorLabel: row.authorLabel,
                      createdAt: new Date(row.createdAt),
                    });
                    const whenLabel = row.resolvedAt
                      ? formatRuDateTime(new Date(row.resolvedAt))
                      : null;
                    const expanded = expandedId === row.id;
                    const pending = row.step == null;
                    const primaryLabel = primaryActionLabel(row.step);
                    const busy = busyId === row.id;

                    return (
                      <li
                        key={row.id}
                        className="min-w-0 overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)]/50 px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className="min-w-0 flex-1 cursor-pointer"
                            role="button"
                            tabIndex={0}
                            aria-expanded={expanded}
                            aria-label="Заполнить протетику наряда"
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
                            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                              <Link
                                prefetch={false}
                                href={orderPathById(row.orderId)}
                                className="font-mono text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProstheticsOpen(false);
                                }}
                              >
                                {row.orderNumber}
                              </Link>
                              {patientName ? (
                                <span className="text-sm font-semibold text-[var(--app-text)]">
                                  {patientName}
                                </span>
                              ) : null}
                              {patientName && doctorName ? (
                                <span className="text-[var(--text-muted)]">
                                  ·
                                </span>
                              ) : null}
                              {doctorName ? (
                                <span className="text-sm font-semibold text-[var(--app-text)]">
                                  {doctorName}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                              <span className="font-medium text-[var(--text-muted)]">
                                От кого и когда:{" "}
                              </span>
                              {authorDetail}
                            </p>
                            {whenLabel ? (
                              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                                <span className="font-medium text-[var(--text-muted)]">
                                  Подтверждена:{" "}
                                </span>
                                {whenLabel}
                              </p>
                            ) : null}
                            <p className="mt-1 min-w-0 whitespace-pre-wrap break-words text-sm text-[var(--text-body)]">
                              {formatProstheticsRequestTextForDisplay(row.text)}
                            </p>
                          </div>
                          {canMarkArrived ? (
                            <div className="flex shrink-0 flex-col items-stretch gap-1.5">
                              <button
                                type="button"
                                className={primaryActionClass(row.step)}
                                disabled={busy}
                                title={primaryLabel}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void advancePrimary(row);
                                }}
                              >
                                {busy ? "…" : primaryLabel}
                              </button>
                              {row.step === "arrived" ? (
                                <button
                                  type="button"
                                  className={stickerActionClass()}
                                  disabled={busy}
                                  title="Проверил и печать этикетки"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void advancePrimary(row, {
                                      printSticker: true,
                                    });
                                  }}
                                >
                                  {busy ? "…" : "Проверил + этикетка"}
                                </button>
                              ) : null}
                              {pending ? (
                                <button
                                  type="button"
                                  className="rounded-md border border-rose-300/80 bg-rose-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-rose-800 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-200"
                                  disabled={busy}
                                  title="Отказать"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void rejectRow(row);
                                  }}
                                >
                                  {busy ? "…" : "Отказать"}
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        {expanded ? (
                          <ProstheticsWarehouseEditPanel
                            orderId={row.orderId}
                            canEdit={canMarkArrived}
                            busy={busy}
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
                href={ordersHistoryHref({ tab: "prosthetics" })}
                className="text-xs font-medium text-[var(--sidebar-blue)] hover:underline"
                onClick={() => setProstheticsOpen(false)}
              >
                Вся история протетики →
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
