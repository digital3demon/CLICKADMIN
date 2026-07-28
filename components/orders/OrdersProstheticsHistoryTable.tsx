"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CORRECTION_SOURCE_LABEL,
  formatCorrectionHistoryAuthorDetail,
  formatCorrectionHistoryDecision,
  PROSTHETICS_ARRIVED_STATUS_LABEL,
  type CorrectionHistoryRow,
} from "@/lib/corrections-history";
import { CorrectionHistoryOrderCell } from "@/components/orders/CorrectionHistoryOrderCell";
import { CorrectionHistoryStatusCell } from "@/components/orders/CorrectionHistoryStatusCell";

type ClientRow = Omit<
  CorrectionHistoryRow,
  "createdAt" | "resolvedAt" | "rejectedAt" | "arrivedAt"
> & {
  createdAt: string;
  resolvedAt: string | null;
  rejectedAt: string | null;
  arrivedAt: string | null;
};

function toClientRow(item: CorrectionHistoryRow): ClientRow {
  return {
    ...item,
    createdAt:
      item.createdAt instanceof Date
        ? item.createdAt.toISOString()
        : String(item.createdAt),
    resolvedAt: item.resolvedAt
      ? item.resolvedAt instanceof Date
        ? item.resolvedAt.toISOString()
        : String(item.resolvedAt)
      : null,
    rejectedAt: item.rejectedAt
      ? item.rejectedAt instanceof Date
        ? item.rejectedAt.toISOString()
        : String(item.rejectedAt)
      : null,
    arrivedAt: item.arrivedAt
      ? item.arrivedAt instanceof Date
        ? item.arrivedAt.toISOString()
        : String(item.arrivedAt)
      : null,
  };
}

function asHistoryRow(row: ClientRow): CorrectionHistoryRow {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    resolvedAt: row.resolvedAt ? new Date(row.resolvedAt) : null,
    rejectedAt: row.rejectedAt ? new Date(row.rejectedAt) : null,
    arrivedAt: row.arrivedAt ? new Date(row.arrivedAt) : null,
  };
}

export function OrdersProstheticsHistoryTable({
  items,
  canMarkArrived = false,
}: {
  items: CorrectionHistoryRow[];
  canMarkArrived?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(() => items.map(toClientRow));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const toggleArrived = useCallback(
    async (row: ClientRow, next: boolean) => {
      if (!row.resolvedAt || row.rejectedAt) return;
      setErr(null);
      setBusyId(row.id);
      try {
        const res = await fetch(
          `/api/orders/${row.order.id}/prosthetics-requests/${row.id}/arrived`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ arrived: next }),
          },
        );
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setErr(j.error ?? "Не удалось обновить");
          return;
        }
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  arrivedAt: next ? new Date().toISOString() : null,
                  arrivedByName: next ? r.arrivedByName : null,
                }
              : r,
          ),
        );
        router.refresh();
      } catch {
        setErr("Сеть недоступна");
      } finally {
        setBusyId(null);
      }
    },
    [router],
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
        По запросу ничего не найдено. Измените строку поиска или сбросьте фильтр.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-2">
      {err ? (
        <p className="text-sm text-red-600" role="alert">
          {err}
        </p>
      ) : null}
      <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[58rem] table-fixed border-collapse text-left text-sm sm:min-w-[64rem]">
          <colgroup>
            <col style={{ width: "12rem" }} />
            <col style={{ width: "8rem" }} />
            <col style={{ width: "10.25rem" }} />
            <col style={{ width: "8rem" }} />
            <col style={{ width: "11rem" }} />
            <col style={{ width: "6.5rem" }} />
            <col />
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              <th className="px-2 py-2.5 sm:px-3 sm:py-3">Заказ</th>
              <th className="px-2 py-2.5 sm:px-3 sm:py-3">Откуда</th>
              <th className="px-2 py-2.5 sm:px-3 sm:py-3">От кого и когда</th>
              <th className="px-2 py-2.5 sm:px-3 sm:py-3">Статус</th>
              <th className="px-2 py-2.5 sm:px-3 sm:py-3">Кем и когда</th>
              <th className="px-2 py-2.5 sm:px-3 sm:py-3">Пришла</th>
              <th className="px-2 py-2.5 sm:px-3 sm:py-3">Текст</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const historyRow = asHistoryRow(item);
              const decision = formatCorrectionHistoryDecision(historyRow);
              const canToggle =
                canMarkArrived &&
                Boolean(item.resolvedAt) &&
                !item.rejectedAt;
              return (
                <tr
                  key={item.id}
                  className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--table-row-hover)]"
                >
                  <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                    <CorrectionHistoryOrderCell order={item.order} />
                  </td>
                  <td className="px-2 py-2 text-[var(--text-strong)] sm:px-3 sm:py-2.5">
                    {CORRECTION_SOURCE_LABEL[item.source]}
                  </td>
                  <td className="px-2 py-2 text-[var(--text-secondary)] sm:px-3 sm:py-2.5">
                    <span className="block whitespace-normal break-words">
                      {formatCorrectionHistoryAuthorDetail(historyRow)}
                    </span>
                  </td>
                  <td className="px-2 py-2 align-top sm:px-3 sm:py-2.5">
                    <CorrectionHistoryStatusCell row={historyRow} />
                  </td>
                  <td className="px-2 py-2 text-[var(--text-secondary)] sm:px-3 sm:py-2.5">
                    {decision.detail ? (
                      <span className="block whitespace-normal break-words">
                        {decision.detail}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                    {canToggle && !item.arrivedAt ? (
                      <button
                        type="button"
                        className="rounded-md border border-sky-300/80 bg-sky-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-sky-800 shadow-sm hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-950/55"
                        disabled={busyId === item.id}
                        onClick={() => void toggleArrived(item, true)}
                      >
                        {busyId === item.id ? "…" : "Пришла"}
                      </button>
                    ) : canToggle && item.arrivedAt ? (
                      <button
                        type="button"
                        className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] shadow-sm hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={busyId === item.id}
                        title="Снять отметку «пришла»"
                        onClick={() => void toggleArrived(item, false)}
                      >
                        {busyId === item.id ? "…" : "Снять"}
                      </button>
                    ) : item.arrivedAt ? (
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        {PROSTHETICS_ARRIVED_STATUS_LABEL}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td
                    className="px-2 py-2 text-[var(--text-secondary)] sm:px-3 sm:py-2.5"
                    title={item.text}
                  >
                    <span className="block whitespace-normal break-words line-clamp-3">
                      {item.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
