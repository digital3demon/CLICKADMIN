"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import {
  formatRuDateTime,
  ordersHistoryHref,
} from "@/lib/corrections-history";
import type { ProstheticsInTransitRow } from "@/lib/prosthetics-in-transit";
import { orderPathById } from "@/lib/order-public-ref";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { CorrectionsHistoryActionCard } from "@/components/orders/CorrectionsHistoryActionCard";

function cardShell(isHarmony: boolean): string {
  return isHarmony
    ? "flex min-h-[7.5rem] min-w-[11rem] flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-center card-shadow transition hover:border-[var(--sidebar-blue)]/50 sm:min-w-[13rem]"
    : "flex min-h-[7.5rem] min-w-[11rem] flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-center shadow-sm ring-1 ring-black/[0.04] transition hover:border-[var(--sidebar-blue)]/40 dark:ring-white/[0.06] sm:min-w-[13rem]";
}

export function OrdersListHeaderActionCards({
  initialInTransitCount,
  canMarkArrived = false,
  showProstheticsBlock = true,
}: {
  initialInTransitCount: number;
  canMarkArrived?: boolean;
  /** Скрыть блок «Заказы протетики», если у роли нет права на эти уведомления. */
  showProstheticsBlock?: boolean;
}) {
  const isHarmony = useUiDesign() === "harmony";
  const router = useRouter();
  const [inTransitCount, setInTransitCount] = useState(initialInTransitCount);
  const [prostheticsOpen, setProstheticsOpen] = useState(false);
  const [items, setItems] = useState<ProstheticsInTransitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmArrivedId, setConfirmArrivedId] = useState<string | null>(null);

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
      setConfirmArrivedId(null);
      return;
    }
    void loadInTransit();
  }, [prostheticsOpen, loadInTransit]);

  const markArrived = useCallback(
    async (row: ProstheticsInTransitRow) => {
      setBusyId(row.id);
      setErr(null);
      try {
        const res = await fetch(
          `/api/orders/${row.orderId}/prosthetics-requests/${row.id}/arrived`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ arrived: true }),
          },
        );
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setErr(j.error ?? "Не удалось отметить");
          setConfirmArrivedId(null);
          return;
        }
        setConfirmArrivedId(null);
        setItems((prev) => prev.filter((x) => x.id !== row.id));
        setInTransitCount((n) => Math.max(0, n - 1));
        router.refresh();
      } catch {
        setErr("Сеть недоступна");
        setConfirmArrivedId(null);
      } finally {
        setBusyId(null);
      }
    },
    [router],
  );

  return (
    <>
      <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row lg:w-auto lg:max-w-[28rem] xl:max-w-[32rem]">
        {showProstheticsBlock ? (
        <button
          type="button"
          className={cardShell(isHarmony)}
          onClick={() => setProstheticsOpen(true)}
        >
          <span className="text-sm font-bold uppercase tracking-wide text-[var(--sidebar-blue)]">
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

        <CorrectionsHistoryActionCard className="flex-1" />
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
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl"
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
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
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

                    return (
                    <li
                      key={row.id}
                      className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)]/50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                            <Link
                              href={orderPathById(row.orderId)}
                              className="font-mono text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
                              onClick={() => setProstheticsOpen(false)}
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
                            {whenLabel ? (
                              <>
                                <span className="text-[var(--text-muted)]">·</span>
                                <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                                  {whenLabel}
                                </span>
                              </>
                            ) : null}
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-body)]">
                            {row.text}
                          </p>
                        </div>
                        {canMarkArrived ? (
                          <button
                            type="button"
                            className={
                              confirmArrivedId === row.id
                                ? "shrink-0 rounded-md border border-emerald-400/90 bg-emerald-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-950 shadow-sm hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-700/80 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-950/70"
                                : "shrink-0 rounded-md border border-sky-300/80 bg-sky-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-sky-800 shadow-sm hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-950/55"
                            }
                            disabled={busyId === row.id}
                            title={
                              confirmArrivedId === row.id
                                ? "Подтвердить: протетика пришла"
                                : "Отметить приход протетики"
                            }
                            onClick={() => {
                              if (confirmArrivedId === row.id) {
                                void markArrived(row);
                                return;
                              }
                              setConfirmArrivedId(row.id);
                              setErr(null);
                            }}
                          >
                            {busyId === row.id
                              ? "…"
                              : confirmArrivedId === row.id
                                ? "Проверил"
                                : "Пришла"}
                          </button>
                        ) : null}
                      </div>
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
