"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
} from "@/lib/prosthetics-in-transit";
import type { ProstheticsProgressStep } from "@/lib/prosthetics-in-transit-step";
import { orderPathById } from "@/lib/order-public-ref";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { CorrectionsHistoryActionCard } from "@/components/orders/CorrectionsHistoryActionCard";
import { LabTasksActionCard } from "@/components/orders/LabTasksActionCard";

function cardShell(isHarmony: boolean): string {
  return isHarmony
    ? "flex min-h-[4.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-2.5 text-center card-shadow transition hover:border-[var(--sidebar-blue)]/50"
    : "flex min-h-[4.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-2.5 text-center shadow-sm ring-1 ring-black/[0.04] transition hover:border-[var(--sidebar-blue)]/40 dark:ring-white/[0.06]";
}

const STEPPER_UI: Array<{
  key: ProstheticsInTransitStep;
  label: string;
  progress?: ProstheticsProgressStep;
}> = [
  { key: "ordered", label: "Заказал" },
  { key: "arrived", label: "Пришла", progress: "arrived" },
  { key: "checked", label: "Проверил", progress: "checked" },
  { key: "done", label: "Готово", progress: "completed" },
];

const STEP_ORDER: ProstheticsInTransitStep[] = [
  "ordered",
  "arrived",
  "checked",
  "done",
];

function stepIndex(step: ProstheticsInTransitStep): number {
  return STEP_ORDER.indexOf(step);
}

function nextProgressStep(
  step: ProstheticsInTransitStep,
): ProstheticsProgressStep | null {
  if (step === "ordered") return "arrived";
  if (step === "arrived") return "checked";
  if (step === "checked") return "completed";
  return null;
}

function ProstheticsTransitStepper({
  row,
  canMark,
  busy,
  onAdvance,
}: {
  row: ProstheticsInTransitRow;
  canMark: boolean;
  busy: boolean;
  onAdvance: (step: ProstheticsProgressStep) => void;
}) {
  const current = row.step ?? "ordered";
  const currentIdx = stepIndex(current);
  const next = nextProgressStep(current);

  return (
    <div
      className="mt-2 flex w-full min-w-0 flex-wrap items-center gap-1 border-t border-[var(--card-border)]/80 pt-2 sm:flex-nowrap"
      role="group"
      aria-label="Статус протетики"
    >
      {STEPPER_UI.map((node, i) => {
        /* Текущий step уже пройден (Заказал = resolved); следующий — кнопка. */
        const done = i <= currentIdx;
        const isNext =
          canMark && next != null && node.progress === next && !busy;

        const base =
          "inline-flex min-w-0 flex-1 items-center justify-center rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide sm:text-[11px]";

        let className = base;
        if (isNext) {
          className +=
            " cursor-pointer border border-sky-300/80 bg-sky-50 text-sky-800 shadow-sm hover:bg-sky-100 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-950/55";
        } else if (done) {
          className +=
            " border border-emerald-400/90 bg-emerald-100 text-emerald-950 dark:border-emerald-700/80 dark:bg-emerald-950/50 dark:text-emerald-100";
        } else {
          className +=
            " border border-transparent bg-transparent text-[var(--text-muted)] opacity-60";
        }

        const showConnector = i < STEPPER_UI.length - 1;

        return (
          <div key={node.key} className="flex min-w-0 flex-1 items-center gap-1">
            {isNext && node.progress ? (
              <button
                type="button"
                className={className}
                disabled={busy}
                title={`Отметить: ${node.label}`}
                onClick={() => onAdvance(node.progress!)}
              >
                {busy ? "…" : node.label}
              </button>
            ) : (
              <span className={className}>{node.label}</span>
            )}
            {showConnector ? (
              <span
                className={
                  i < currentIdx
                    ? "hidden shrink-0 text-emerald-600 sm:inline"
                    : "hidden shrink-0 text-[var(--text-muted)] sm:inline"
                }
                aria-hidden
              >
                —
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function OrdersListHeaderActionCards({
  initialInTransitCount,
  initialCorrectionsPendingCount = 0,
  initialTasksPendingCount = 0,
  initialPickupsPendingCount = 0,
  canMarkArrived = false,
  canResolveTasks = false,
  showProstheticsBlock = true,
  canAcceptCorrections = false,
}: {
  initialInTransitCount: number;
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
  const [prostheticsOpen, setProstheticsOpen] = useState(false);
  const [items, setItems] = useState<ProstheticsInTransitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setInTransitCount(initialInTransitCount);
  }, [initialInTransitCount]);

  const loadInTransit = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/order-prosthetics-requests/in-transit", {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await res.json().catch(() => ({}))) as {
        count?: number;
        items?: ProstheticsInTransitRow[];
        error?: string;
      };
      if (!res.ok) {
        setErr(j.error ?? "Не удалось загрузить");
        return;
      }
      setItems(Array.isArray(j.items) ? j.items : []);
      setInTransitCount(typeof j.count === "number" ? j.count : 0);
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!prostheticsOpen) {
      setExpandedId(null);
      return;
    }
    void loadInTransit();
  }, [prostheticsOpen, loadInTransit]);

  const advanceStep = useCallback(
    async (row: ProstheticsInTransitRow, step: ProstheticsProgressStep) => {
      setBusyId(row.id);
      setErr(null);
      try {
        const res = await fetch(
          `/api/orders/${row.orderId}/prosthetics-requests/${row.id}/progress`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step }),
          },
        );
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setErr(j.error ?? "Не удалось обновить статус");
          return;
        }

        if (step === "completed") {
          setItems((prev) => prev.filter((x) => x.id !== row.id));
          setInTransitCount((n) => Math.max(0, n - 1));
        } else {
          const now = new Date().toISOString();
          setItems((prev) =>
            prev.map((x) => {
              if (x.id !== row.id) return x;
              if (step === "arrived") {
                return {
                  ...x,
                  arrivedAt: now,
                  step: "arrived",
                  prostheticsOrdered: true,
                };
              }
              return {
                ...x,
                checkedAt: now,
                step: "checked",
              };
            }),
          );
        }
        router.refresh();
      } catch {
        setErr("Сеть недоступна");
      } finally {
        setBusyId(null);
      }
    },
    [router],
  );

  return (
    <>
      <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:max-w-[36rem] xl:max-w-[42rem]">
        {showProstheticsBlock ? (
        <button
          type="button"
          className={cardShell(isHarmony)}
          onClick={() => setProstheticsOpen(true)}
        >
          <span className="text-[11px] font-bold uppercase leading-tight tracking-wide text-[var(--sidebar-blue)] sm:text-xs">
            Заказы протетики
          </span>
          <span className="flex items-center justify-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              В пути
            </span>
            <span
              className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white"
              aria-label={`В пути: ${inTransitCount}`}
            >
              {inTransitCount}
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
          aria-label="Заказы протетики в пути"
          onClick={() => setProstheticsOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
              <h2 className="text-base font-semibold text-[var(--app-text)]">
                Заказы протетики · в пути
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
              ) : items.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  Нет протетики в пути.
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
                    const whenLabel = row.resolvedAt
                      ? formatRuDateTime(new Date(row.resolvedAt))
                      : null;
                    const authorDetail = formatCorrectionHistoryAuthorDetail({
                      authorLabel: row.authorLabel,
                      createdAt: new Date(row.createdAt),
                    });
                    const clientLines = row.clientProvided ?? [];
                    const ourLines = row.ourLines ?? [];
                    const expanded = expandedId === row.id;

                    return (
                    <li
                      key={row.id}
                      className="min-w-0 overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)]/50 px-3 py-2"
                    >
                      <div
                        className="min-w-0 cursor-pointer"
                        role="button"
                        tabIndex={0}
                        aria-expanded={expanded}
                        aria-label="Показать протетику со склада"
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
                            <span className="text-[var(--text-muted)]">·</span>
                          ) : null}
                          {doctorName ? (
                            <span className="text-sm font-semibold text-[var(--app-text)]">
                              {doctorName}
                            </span>
                          ) : null}
                          {row.prostheticsOrdered ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-300/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-950/40 dark:text-emerald-100"
                              title="На наряде отмечено «Протетика заказана»"
                            >
                              <span aria-hidden>✓</span>
                              Заказана
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]"
                              title="Галочка «Протетика заказана» на наряде не стоит"
                            >
                              Не заказана
                            </span>
                          )}
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
                              Принята:{" "}
                            </span>
                            {whenLabel}
                          </p>
                        ) : null}
                        <p className="mt-1 min-w-0 whitespace-pre-wrap break-words text-sm text-[var(--text-body)]">
                          {row.text}
                        </p>
                      </div>

                      <ProstheticsTransitStepper
                        row={row}
                        canMark={canMarkArrived}
                        busy={busyId === row.id}
                        onAdvance={(step) => void advanceStep(row, step)}
                      />

                      {expanded ? (
                      <div className="mt-2 grid min-w-0 grid-cols-1 gap-2 border-t border-[var(--card-border)]/80 pt-2 sm:grid-cols-2">
                        <div className="min-w-0 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)]/70 px-2.5 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                            Предоставлено клиентом
                          </p>
                          {clientLines.length === 0 ? (
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              —
                            </p>
                          ) : (
                            <ul className="mt-1 flex min-w-0 flex-wrap gap-x-2 gap-y-1">
                              {clientLines.map((line, i) => (
                                <li
                                  key={`c-${row.id}-${i}`}
                                  className="min-w-0 max-w-full rounded border border-[var(--card-border)] bg-[var(--surface-subtle)] px-1.5 py-0.5 text-xs text-[var(--app-text)]"
                                >
                                  <span className="break-words">
                                    {line.description}
                                  </span>
                                  <span className="text-[var(--text-muted)]">
                                    {" "}
                                    · {line.quantity}шт
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="min-w-0 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)]/70 px-2.5 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                            Наше (со склада)
                          </p>
                          {ourLines.length === 0 ? (
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              —
                            </p>
                          ) : (
                            <ul className="mt-1 flex min-w-0 flex-wrap gap-x-2 gap-y-1">
                              {ourLines.map((line, i) => (
                                <li
                                  key={`o-${row.id}-${i}`}
                                  className="min-w-0 max-w-full rounded border border-[var(--card-border)] bg-[var(--surface-subtle)] px-1.5 py-0.5 text-xs text-[var(--app-text)]"
                                >
                                  <span className="break-words">
                                    {line.label}
                                  </span>
                                  <span className="text-[var(--text-muted)]">
                                    {" "}
                                    · {line.quantity}шт
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
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
