"use client";

import { useCallback, useEffect, useState } from "react";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import { orderPathById } from "@/lib/order-public-ref";
import {
  FINANCE_OFFICE_DEBT_NOTIFY_MAX,
  financeOfficeDebtPaymentLabel,
} from "@/lib/finance-office-debts";
import {
  canonicalOrderPayment,
  ORDER_PAYMENT_PARTIAL,
} from "@/lib/order-clinic-client-fields";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import {
  paymentValueToHarmonyTone,
  resolveListPillClass,
} from "@/lib/harmony-list-pill";
import { formatDebtDocumentOpenLabel } from "@/lib/format-invoice-number-ru";
import { crmCityAddressTextClass } from "@/lib/crm-lab-city";

type DebtRow = {
  orderId: string;
  orderNumber: string;
  patientName: string | null;
  doctorName: string | null;
  clinicName: string | null;
  clinicAddress?: string | null;
  ourLegalEntity: string | null;
  theirLegalName: string | null;
  theirInn: string | null;
  email: string;
  payment: string;
  paymentPartialRub: number | null;
  hasInvoice: boolean;
  hasUpd: boolean;
  invoiceNumber?: string | null;
  updNumber?: string | null;
  invoiceAttachmentId?: string | null;
  updAttachmentId?: string | null;
  issuedAtIso?: string | null;
  updAtIso?: string | null;
};

function debtPaymentClassicClass(payment: string): string {
  const p = canonicalOrderPayment(payment);
  if (p === ORDER_PAYMENT_PARTIAL) {
    return "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-100";
  }
  return "border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-700/70 dark:bg-rose-950/40 dark:text-rose-100";
}

function cardShell(isHarmony: boolean): string {
  return isHarmony
    ? "flex h-full min-h-[2.65rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-1 py-1 text-center card-shadow transition hover:border-[var(--sidebar-blue)]/50 sm:min-h-[3.25rem] sm:px-1.5 sm:py-1.5"
    : "flex h-full min-h-[2.65rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-1 py-1 text-center shadow-sm ring-1 ring-black/[0.04] transition hover:border-[var(--sidebar-blue)]/40 dark:ring-white/[0.06] sm:min-h-[3.25rem] sm:px-1.5 sm:py-1.5";
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
    const firstNum = items.find((r) => r.orderId === ids[0])?.orderNumber ?? "";
    const ok = window.confirm(
      ids.length === 1
        ? `Пометить наряд ${firstNum} как «Оплачено»?`
        : `Пометить выбранные наряды (${ids.length}) как «Оплачено»?`,
    );
    if (!ok) return;
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
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  return (
    <>
      <button
        type="button"
        className={`${cardShell(isHarmony)} ${className}`.trim()}
        onClick={() => setOpen(true)}
      >
        <span className="text-[9px] font-bold uppercase leading-tight tracking-wide text-rose-600 dark:text-rose-400 sm:text-[11px]">
          Долги
        </span>
        <span className="flex items-center justify-center gap-1 sm:gap-1.5">
          <span className="hidden text-[9px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] sm:inline sm:text-xs">
            Просрочено
          </span>
          <span
            className="inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-rose-600 px-1 py-0.5 text-[10px] font-bold tabular-nums text-white sm:min-w-[1.5rem] sm:px-1.5 sm:text-xs"
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
            className="flex max-h-[90vh] w-full max-w-[86rem] flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl"
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
                <table className="w-full min-w-[72rem] border-separate border-spacing-0 text-left text-xs">
                  <thead>
                    <tr className="bg-[var(--surface-subtle)] text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                      <th className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={allSelected}
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
                      <th className="whitespace-nowrap px-2 py-1.5">Наряд</th>
                      <th className="px-2 py-1.5">Клиника</th>
                      <th className="px-2 py-1.5">Доктор</th>
                      <th className="px-2 py-1.5">Пациент</th>
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
                        <td className="whitespace-nowrap px-2 py-1.5 font-mono">
                          <a
                            href={orderPathById(r.orderId)}
                            className="text-[var(--sidebar-blue)] hover:underline"
                          >
                            {r.orderNumber}
                          </a>
                        </td>
                        <td
                          className={`px-2 py-1.5 ${
                            r.clinicName
                              ? crmCityAddressTextClass(r.clinicAddress)
                              : "text-[var(--text-secondary)]"
                          }`}
                          title={r.clinicAddress?.trim() || undefined}
                        >
                          {r.clinicName || "Частное лицо"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5">
                          {personNameSurnameInitials(r.doctorName) || "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.patientName?.trim() || "—"}
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
                        <td className="min-w-[10rem] px-2 py-1.5">
                          <div className="flex flex-col items-start gap-1">
                            {r.hasInvoice && r.invoiceAttachmentId ? (
                              <a
                                href={`/api/orders/${r.orderId}/attachments/${r.invoiceAttachmentId}?inline=1`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Открыть счёт"
                                className="rounded-md border border-sky-400/70 bg-sky-50 px-1.5 py-0.5 text-left text-[11px] font-semibold leading-snug text-sky-950 hover:bg-sky-100 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-100 dark:hover:bg-sky-950/60"
                              >
                                {formatDebtDocumentOpenLabel(
                                  "invoice",
                                  r.invoiceNumber,
                                  r.issuedAtIso,
                                )}
                              </a>
                            ) : null}
                            {r.hasUpd && r.updAttachmentId ? (
                              <a
                                href={`/api/orders/${r.orderId}/attachments/${r.updAttachmentId}?inline=1`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Открыть УПД"
                                className="rounded-md border border-violet-400/70 bg-violet-50 px-1.5 py-0.5 text-left text-[11px] font-semibold leading-snug text-violet-950 hover:bg-violet-100 dark:border-violet-800/70 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-950/60"
                              >
                                {formatDebtDocumentOpenLabel(
                                  "upd",
                                  r.updNumber,
                                  r.updAtIso ?? r.issuedAtIso,
                                )}
                              </a>
                            ) : null}
                            {!r.hasInvoice && !r.hasUpd ? (
                              <span className="text-[var(--text-muted)]">—</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            disabled={busy}
                            title="Сменить на «Оплачено»"
                            className={resolveListPillClass(
                              isHarmony,
                              `rounded border px-1.5 py-0.5 text-[11px] font-medium disabled:opacity-50 ${debtPaymentClassicClass(r.payment)}`,
                              paymentValueToHarmonyTone(r.payment),
                            )}
                            onClick={() => void markPaid([r.orderId])}
                          >
                            {financeOfficeDebtPaymentLabel(
                              r.payment,
                              r.paymentPartialRub,
                            )}
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
                  disabled={busy || items.length === 0}
                  className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
                  onClick={() =>
                    setSelected(new Set(items.map((r) => r.orderId)))
                  }
                >
                  Выбрать все
                </button>
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
