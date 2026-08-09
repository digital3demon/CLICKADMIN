"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { CorrectionsHistoryActionCard } from "@/components/orders/CorrectionsHistoryActionCard";
import { LabTasksActionCard } from "@/components/orders/LabTasksActionCard";
import { ProstheticsWarehouseEditPanel } from "@/components/orders/ProstheticsWarehouseEditPanel";

type ProstheticsModalMode = "to-order" | "in-transit";

function cardShell(isHarmony: boolean): string {
  return isHarmony
    ? "flex min-h-[4.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-2 text-center card-shadow transition hover:border-[var(--sidebar-blue)]/50"
    : "flex min-h-[4.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-2 text-center shadow-sm ring-1 ring-black/[0.04] transition hover:border-[var(--sidebar-blue)]/40 dark:ring-white/[0.06]";
}

function modeTabClass(active: boolean): string {
  return active
    ? "inline-flex items-center gap-1.5 rounded-md bg-[var(--sidebar-blue)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm"
    : "inline-flex items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]";
}

const STEPPER_UI: Array<{
  key: ProstheticsInTransitStep;
  label: string;
  progress?: ProstheticsProgressStep;
}> = [
  { key: "ordered", label: "Заказал" },
  { key: "arrived", label: "Пришла", progress: "arrived" },
  { key: "checked", label: "Проверил", progress: "checked" },
  /* Готово — только индикатор: выставляется вместе с «Проверил». */
  { key: "done", label: "Готово" },
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
  const [modalMode, setModalMode] = useState<ProstheticsModalMode>("in-transit");
  const [inTransitItems, setInTransitItems] = useState<ProstheticsInTransitRow[]>(
    [],
  );
  const [toOrderItems, setToOrderItems] = useState<ProstheticsToOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const saveProstheticsRef = useRef<(() => Promise<boolean>) | null>(null);

  useEffect(() => {
    setInTransitCount(initialInTransitCount);
  }, [initialInTransitCount]);

  useEffect(() => {
    setToOrderCount(initialToOrderCount);
  }, [initialToOrderCount]);

  const loadInTransit = useCallback(async () => {
    const res = await fetch("/api/order-prosthetics-requests/in-transit", {
      credentials: "include",
      cache: "no-store",
    });
    const j = (await res.json().catch(() => ({}))) as {
      count?: number;
      items?: ProstheticsInTransitRow[];
      error?: string;
    };
    if (!res.ok) throw new Error(j.error ?? "Не удалось загрузить «В пути»");
    setInTransitItems(Array.isArray(j.items) ? j.items : []);
    setInTransitCount(typeof j.count === "number" ? j.count : 0);
  }, []);

  const loadToOrder = useCallback(async () => {
    const res = await fetch("/api/order-prosthetics-requests/to-order", {
      credentials: "include",
      cache: "no-store",
    });
    const j = (await res.json().catch(() => ({}))) as {
      count?: number;
      items?: ProstheticsToOrderRow[];
      error?: string;
    };
    if (!res.ok) throw new Error(j.error ?? "Не удалось загрузить «Заказать»");
    setToOrderItems(Array.isArray(j.items) ? j.items : []);
    setToOrderCount(typeof j.count === "number" ? j.count : 0);
  }, []);

  const loadModal = useCallback(
    async (mode: ProstheticsModalMode) => {
      setLoading(true);
      setErr(null);
      try {
        if (mode === "in-transit") await loadInTransit();
        else await loadToOrder();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Сеть недоступна");
      } finally {
        setLoading(false);
      }
    },
    [loadInTransit, loadToOrder],
  );

  const openProsthetics = useCallback(
    (mode: ProstheticsModalMode) => {
      setModalMode(mode);
      setExpandedId(null);
      setProstheticsOpen(true);
    },
    [],
  );

  useEffect(() => {
    if (!prostheticsOpen) {
      setExpandedId(null);
      return;
    }
    void loadModal(modalMode);
  }, [prostheticsOpen, modalMode, loadModal]);

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

        if (step === "completed" || step === "checked") {
          setInTransitItems((prev) => prev.filter((x) => x.id !== row.id));
          setInTransitCount((n) => Math.max(0, n - 1));
        } else {
          const now = new Date().toISOString();
          setInTransitItems((prev) =>
            prev.map((x) => {
              if (x.id !== row.id) return x;
              return {
                ...x,
                arrivedAt: now,
                step: "arrived",
                prostheticsOrdered: true,
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

  const onPanelError = useCallback((message: string) => {
    setErr(message.trim() ? message : null);
  }, []);

  const registerSave = useCallback((fn: (() => Promise<boolean>) | null) => {
    saveProstheticsRef.current = fn;
  }, []);

  const acceptToOrder = useCallback(
    async (row: ProstheticsToOrderRow) => {
      if (!canMarkArrived) return;
      setBusyId(row.id);
      setErr(null);
      try {
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
          setErr(j.error ?? "Не удалось принять");
          return;
        }
        setToOrderItems((prev) => prev.filter((x) => x.id !== row.id));
        setToOrderCount((n) => Math.max(0, n - 1));
        setInTransitCount((n) => n + 1);
        setExpandedId(null);
        router.refresh();
      } catch {
        setErr("Сеть недоступна");
      } finally {
        setBusyId(null);
      }
    },
    [canMarkArrived, expandedId, router],
  );

  return (
    <>
      <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:max-w-[36rem] xl:max-w-[42rem]">
        {showProstheticsBlock ? (
        <div className={cardShell(isHarmony)}>
          <span className="text-[11px] font-bold uppercase leading-tight tracking-wide text-[var(--sidebar-blue)] sm:text-xs">
            Заказы протетики
          </span>
          <div className="grid w-full grid-cols-2 gap-1">
            <button
              type="button"
              className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 py-0.5 hover:bg-[var(--surface-muted)]"
              onClick={() => openProsthetics("to-order")}
              title="Заявки к заказу"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] sm:text-xs">
                Заказать
              </span>
              <span
                className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white"
                aria-label={`Заказать: ${toOrderCount}`}
              >
                {toOrderCount}
              </span>
            </button>
            <button
              type="button"
              className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 py-0.5 hover:bg-[var(--surface-muted)]"
              onClick={() => openProsthetics("in-transit")}
              title="Протетика в пути"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] sm:text-xs">
                В пути
              </span>
              <span
                className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white"
                aria-label={`В пути: ${inTransitCount}`}
              >
                {inTransitCount}
              </span>
            </button>
          </div>
        </div>
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
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-[var(--app-text)]">
                  Заказы протетики
                </h2>
                <div
                  className="flex flex-wrap items-center gap-1.5"
                  role="tablist"
                  aria-label="Режим списка"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={modalMode === "to-order"}
                    className={modeTabClass(modalMode === "to-order")}
                    onClick={() => {
                      setExpandedId(null);
                      setModalMode("to-order");
                    }}
                  >
                    Заказать
                    <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-black/15 px-1.5 py-0.5 text-[10px] tabular-nums">
                      {toOrderCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={modalMode === "in-transit"}
                    className={modeTabClass(modalMode === "in-transit")}
                    onClick={() => {
                      setExpandedId(null);
                      setModalMode("in-transit");
                    }}
                  >
                    В пути
                    <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-black/15 px-1.5 py-0.5 text-[10px] tabular-nums">
                      {inTransitCount}
                    </span>
                  </button>
                </div>
              </div>
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
              ) : modalMode === "to-order" ? (
                toOrderItems.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Нет заявок на заказ протетики.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {toOrderItems.map((row) => {
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
                      const expanded = expandedId === row.id;

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
                              <p className="mt-1 min-w-0 whitespace-pre-wrap break-words text-sm text-[var(--text-body)]">
                                {row.text}
                              </p>
                            </div>
                            {canMarkArrived ? (
                              <button
                                type="button"
                                className="shrink-0 rounded-md border border-emerald-400/90 bg-emerald-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-950 hover:bg-emerald-200 disabled:opacity-50 dark:border-emerald-700/80 dark:bg-emerald-950/50 dark:text-emerald-100"
                                disabled={busyId === row.id}
                                title="Принять — протетика в пути"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void acceptToOrder(row);
                                }}
                              >
                                {busyId === row.id ? "…" : "Принять"}
                              </button>
                            ) : null}
                          </div>
                          {expanded ? (
                            <ProstheticsWarehouseEditPanel
                              orderId={row.orderId}
                              canEdit={canMarkArrived}
                              busy={busyId === row.id}
                              onError={onPanelError}
                              registerSave={registerSave}
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : inTransitItems.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  Нет протетики в пути.
                </p>
              ) : (
                <ul className="space-y-2">
                  {inTransitItems.map((row) => {
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
                        <ProstheticsWarehouseEditPanel
                          orderId={row.orderId}
                          canEdit={canMarkArrived}
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
