"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import { ordersHistoryHref } from "@/lib/corrections-history";
import type { ProstheticsInTransitRow } from "@/lib/prosthetics-in-transit";
import { orderPathById } from "@/lib/order-public-ref";

function cardShell(isHarmony: boolean): string {
  return isHarmony
    ? "flex min-h-[7.5rem] min-w-[11rem] flex-1 flex-col justify-between rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-left card-shadow transition hover:border-[var(--sidebar-blue)]/50 sm:min-w-[13rem]"
    : "flex min-h-[7.5rem] min-w-[11rem] flex-1 flex-col justify-between rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-left shadow-sm ring-1 ring-black/[0.04] transition hover:border-[var(--sidebar-blue)]/40 dark:ring-white/[0.06] sm:min-w-[13rem]";
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
  const [correctionsOpen, setCorrectionsOpen] = useState(false);
  const [items, setItems] = useState<ProstheticsInTransitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
    if (!prostheticsOpen) return;
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
          return;
        }
        setItems((prev) => prev.filter((x) => x.id !== row.id));
        setInTransitCount((n) => Math.max(0, n - 1));
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
      <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row lg:w-auto lg:max-w-[28rem] xl:max-w-[32rem]">
        {showProstheticsBlock ? (
        <button
          type="button"
          className={cardShell(isHarmony)}
          onClick={() => setProstheticsOpen(true)}
        >
          <span className="block text-sm font-bold uppercase tracking-wide text-[var(--sidebar-blue)]">
            Заказы протетики
          </span>
          <span className="mt-3 flex items-center gap-2">
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

        <button
          type="button"
          className={cardShell(isHarmony)}
          onClick={() => setCorrectionsOpen(true)}
        >
          <span className="block text-sm font-bold uppercase tracking-wide text-orange-500 dark:text-orange-400">
            История корректировок
          </span>
        </button>
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
                  {items.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)]/50 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={orderPathById(row.orderId)}
                            className="font-mono text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
                            onClick={() => setProstheticsOpen(false)}
                          >
                            {row.orderNumber}
                          </Link>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-body)]">
                            {row.text}
                          </p>
                        </div>
                        {canMarkArrived ? (
                          <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-[var(--text-body)]">
                            <input
                              type="checkbox"
                              className="size-4 rounded border-[var(--card-border)]"
                              checked={false}
                              disabled={busyId === row.id}
                              onChange={() => void markArrived(row)}
                            />
                            пришла
                          </label>
                        ) : null}
                      </div>
                    </li>
                  ))}
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

      {correctionsOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="История корректировок"
          onClick={() => setCorrectionsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-orange-500 dark:text-orange-400">
              История корректировок
            </h2>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm text-[var(--text-body)] hover:bg-[var(--surface-muted)]"
                onClick={() => setCorrectionsOpen(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
