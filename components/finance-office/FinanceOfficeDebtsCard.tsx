"use client";

import { useCallback, useEffect, useState } from "react";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import { orderPathById } from "@/lib/order-public-ref";
import { FINANCE_OFFICE_DEBT_NOTIFY_MAX } from "@/lib/finance-office-debts";

type DebtRow = {
  orderId: string;
  orderNumber: string;
  patientName: string | null;
  clinicName: string | null;
  ourLegalEntity: string | null;
  theirLegalName: string | null;
  theirInn: string | null;
  email: string;
  hasInvoice: boolean;
  hasUpd: boolean;
};

function cardShell(isHarmony: boolean): string {
  return isHarmony
    ? "flex h-full min-h-[3.25rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-1.5 py-1.5 text-center card-shadow transition hover:border-[var(--sidebar-blue)]/50"
    : "flex h-full min-h-[3.25rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-1.5 py-1.5 text-center shadow-sm ring-1 ring-black/[0.04] transition hover:border-[var(--sidebar-blue)]/40 dark:ring-white/[0.06]";
}

export function FinanceOfficeDebtsCard({
  className = "",
  initialCount = 0,
}: {
  className?: string;
  initialCount?: number;
}) {
  const isHarmony = useUiDesign() === "harmony";
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [listTruncated, setListTruncated] = useState(false);
  const [items, setItems] = useState<DebtRow[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/finance-office/debts", {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        items?: DebtRow[];
        count?: number;
      };
      if (!res.ok) {
        setErr(typeof j.error === "string" ? j.error : "Не удалось загрузить");
        return;
      }
      const rows = Array.isArray(j.items) ? j.items : [];
      setItems(rows);
      const total = typeof j.count === "number" ? j.count : rows.length;
      setCount(total);
      setListTruncated(total > rows.length);
      setEmails(Object.fromEntries(rows.map((r) => [r.orderId, r.email])));
      setSelected(new Set(rows.map((r) => r.orderId)));
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const toggle = (id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const markPaid = async (ids: string[]) => {
    if (ids.length === 0) return;
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      const res = await fetch("/api/finance-office/debts/mark-paid", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: ids }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(typeof j.error === "string" ? j.error : "Не удалось отметить оплату");
        return;
      }
      await load();
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const payload = items
      .filter((r) => selected.has(r.orderId))
      .map((r) => ({
        orderId: r.orderId,
        email: (emails[r.orderId] ?? r.email).trim(),
      }));
    if (payload.length === 0) return;
    if (payload.length > FINANCE_OFFICE_DEBT_NOTIFY_MAX) {
      setErr(
        `За один раз не больше ${FINANCE_OFFICE_DEBT_NOTIFY_MAX} писем. Снимите часть галочек.`,
      );
      return;
    }
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      const res = await fetch("/api/finance-office/debts/notify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        sent?: number;
        failed?: number;
        results?: Array<{ message: string; ok: boolean }>;
      };
      if (!res.ok) {
        setErr(typeof j.error === "string" ? j.error : "Не удалось отправить");
        return;
      }
      const failNotes = (j.results ?? [])
        .filter((r) => !r.ok)
        .map((r) => r.message)
        .slice(0, 4);
      setInfo(
        `Отправлено: ${j.sent ?? 0}` +
          (j.failed ? `. Ошибок: ${j.failed}${failNotes.length ? ` (${failNotes.join("; ")})` : ""}` : ""),
      );
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  };

  const selectedIds = items.filter((r) => selected.has(r.orderId)).map((r) => r.orderId);

  return (
    <>
      <button
        type="button"
        className={`${cardShell(isHarmony)} ${className}`.trim()}
        onClick={() => setOpen(true)}
      >
        <span className="text-[10px] font-bold uppercase leading-tight tracking-wide text-rose-600 dark:text-rose-400 sm:text-[11px]">
          Долги
        </span>
        <span className="flex items-center justify-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] sm:text-xs">
            Просрочено
          </span>
          <span
            className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white"
            aria-label={`Долгов: ${count}`}
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
          aria-label="Долги"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
              <h2 className="text-base font-semibold text-rose-600 dark:text-rose-400">
                Долги
              </h2>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                onClick={() => setOpen(false)}
              >
                Закрыть
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
              {err ? (
                <p className="mb-2 text-sm text-red-600" role="alert">
                  {err}
                </p>
              ) : null}
              {info ? (
                <p className="mb-2 text-sm text-[var(--text-body)]">{info}</p>
              ) : null}
              {listTruncated ? (
                <p className="mb-2 text-sm text-amber-800 dark:text-amber-200">
                  Показаны первые {items.length} из {count}. Сузьте долги
                  отметкой оплаты или разбейте рассылку.
                </p>
              ) : null}
              {loading ? (
                <p className="text-sm text-[var(--text-muted)]">Загрузка…</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Просроченных неоплаченных счетов нет.
                </p>
              ) : (
                <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-left text-xs">
                  <thead>
                    <tr className="bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                      <th className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={selected.size === items.length}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? new Set(items.map((r) => r.orderId))
                                : new Set(),
                            )
                          }
                          aria-label="Выбрать все"
                        />
                      </th>
                      <th className="px-2 py-1.5">Наряд</th>
                      <th className="px-2 py-1.5">Клиника / пациент</th>
                      <th className="px-2 py-1.5">Наше юрлицо</th>
                      <th className="px-2 py-1.5">Их юрлицо</th>
                      <th className="px-2 py-1.5">ИНН</th>
                      <th className="px-2 py-1.5">Почта</th>
                      <th className="px-2 py-1.5">Файлы</th>
                      <th className="px-2 py-1.5">Оплата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr
                        key={r.orderId}
                        className="border-b border-[var(--card-border)]"
                      >
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={selected.has(r.orderId)}
                            onChange={(e) => toggle(r.orderId, e.target.checked)}
                            aria-label={`Выбрать ${r.orderNumber}`}
                          />
                        </td>
                        <td className="px-2 py-1.5 font-mono">
                          <a
                            href={orderPathById(r.orderId)}
                            className="text-[var(--sidebar-blue)] hover:underline"
                          >
                            {r.orderNumber}
                          </a>
                        </td>
                        <td className="px-2 py-1.5">
                          <div>{r.clinicName || "Частное лицо"}</div>
                          <div className="text-[var(--text-muted)]">
                            {r.patientName || "—"}
                          </div>
                        </td>
                        <td className="px-2 py-1.5">{r.ourLegalEntity || "—"}</td>
                        <td className="px-2 py-1.5">{r.theirLegalName || "—"}</td>
                        <td className="px-2 py-1.5">{r.theirInn || "—"}</td>
                        <td className="px-2 py-1.5">
                          <input
                            type="email"
                            className="w-44 rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-1.5 py-1 text-xs"
                            value={emails[r.orderId] ?? ""}
                            onChange={(e) =>
                              setEmails((p) => ({
                                ...p,
                                [r.orderId]: e.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5 text-[var(--text-muted)]">
                          {[r.hasInvoice ? "счёт" : null, r.hasUpd ? "УПД" : null]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded border border-emerald-600/50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                            onClick={() => void markPaid([r.orderId])}
                          >
                            Оплачено
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {items.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--card-border)] px-4 py-3">
                <button
                  type="button"
                  disabled={busy || selectedIds.length === 0}
                  className="rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                  onClick={() => void send()}
                >
                  Отправить уведомление
                </button>
                <button
                  type="button"
                  disabled={busy || selectedIds.length === 0}
                  className="rounded-md border border-emerald-600/50 bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-200"
                  onClick={() => void markPaid(selectedIds)}
                >
                  Отметить оплаченными
                </button>
                <span className="text-xs text-[var(--text-muted)]">
                  Выбрано: {selectedIds.length}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
