"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { orderPathById } from "@/lib/order-public-ref";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { financeOfficeListHref } from "@/lib/finance-office-list-query";
import {
  LIST_TAG_FINANCE_CALCULATED,
  LIST_TAG_FINANCE_NOT_CALCULATED,
  LIST_TAG_ORDER_ATTENTION,
  LIST_TAG_PAYMENT_PAID,
  LIST_TAG_PAYMENT_PARTIAL,
  LIST_TAG_PAYMENT_EXPECTED,
  LIST_TAG_PROSTHETICS_PENDING,
} from "@/lib/order-list-tag-filter";
import {
  canonicalOrderPayment,
  ORDER_PAYMENT_PAID,
  ORDER_PAYMENT_PARTIAL,
} from "@/lib/order-clinic-client-fields";

export type FinanceOfficeOrderTableRow = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  legalEntity: string | null;
  dueDate: string | null;
  clinic: { id: string; name: string; address: string | null } | null;
  counterpartyRequisitesText: string | null;
  doctor: { id: string; fullName: string };
  payment: string | null;
  paymentPartialRub: number | null;
  financeCalculated: boolean;
  listCompositionMismatch: boolean;
  listPendingChatCorrections: boolean;
  listPendingProstheticsRequests: boolean;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function pillClass(kind: "warn" | "sky" | "green" | "muted" | "amber") {
  if (kind === "warn") return "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100";
  if (kind === "sky") return "border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100";
  if (kind === "green") return "border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100";
  if (kind === "amber") return "border-orange-300 bg-orange-100 text-orange-950 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100";
  return "border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-strong)]";
}

function Pill({
  href,
  kind,
  children,
}: {
  href: string;
  kind: "warn" | "sky" | "green" | "muted" | "amber";
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold leading-tight hover:opacity-85 ${pillClass(kind)}`}
    >
      {children}
    </Link>
  );
}

export function FinanceOfficeOrdersTable({
  orders,
  activeTag = null,
}: {
  orders: FinanceOfficeOrderTableRow[];
  activeTag?: string | null;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const visibleIds = useMemo(() => orders.map((o) => o.id), [orders]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };

  if (orders.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
        В ФинОтделе нет нарядов по текущему фильтру.
      </p>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2">
        <div className="text-sm font-medium text-[var(--text-body)]">
          Нарядов: {orders.length} · выбрано: {selected.size}
          {activeTag ? <span className="ml-2 text-[var(--text-muted)]">Фильтр: {activeTag}</span> : null}
        </div>
        <button
          type="button"
          onClick={toggleAllVisible}
          className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
        >
          {allVisibleSelected ? "Снять видимые" : "Выбрать все видимые"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-max min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              <th className="px-2 py-2 text-center normal-case">Выбрать</th>
              <th className="px-2 py-2 text-center">№ наряда</th>
              <th className="px-2 py-2 text-center">Клиника</th>
              <th className="px-2 py-2 text-center">Врач</th>
              <th className="px-2 py-2 text-center">Пациент</th>
              <th className="px-2 py-2 text-center">Лаборатория</th>
              <th className="min-w-[14rem] px-2 py-2 text-center normal-case">Реквизиты</th>
              <th className="min-w-[10rem] px-2 py-2 text-center normal-case">Наше юрлицо</th>
              <th className="min-w-[14rem] px-2 py-2 text-center normal-case">Отметки</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const payment = canonicalOrderPayment(o.payment);
              return (
                <tr
                  key={o.id}
                  className="border-b border-[var(--card-border)] transition-colors hover:bg-[var(--table-row-hover)]"
                >
                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--input-border)]"
                      checked={selected.has(o.id)}
                      onChange={(e) =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(o.id);
                          else next.delete(o.id);
                          return next;
                        })
                      }
                      aria-label={`Выбрать наряд ${o.orderNumber}`}
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 font-mono font-semibold">
                    <Link href={orderPathById(o.id)} className="text-[var(--sidebar-blue)] hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="max-w-[13rem] px-2 py-2">
                    {o.clinic ? (
                      <Link href={`/clients/${o.clinic.id}`} className="text-[var(--sidebar-blue)] hover:underline">
                        {o.clinic.name}
                      </Link>
                    ) : (
                      <span className="text-[var(--text-secondary)]">Частное лицо</span>
                    )}
                  </td>
                  <td className="max-w-[10rem] px-2 py-2">
                    <Link href={`/clients/doctors/${o.doctor.id}`} className="text-[var(--sidebar-blue)] hover:underline">
                      {personNameSurnameInitials(o.doctor.fullName)}
                    </Link>
                  </td>
                  <td className="max-w-[10rem] px-2 py-2">
                    {o.patientName ? personNameSurnameInitials(o.patientName) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-[var(--text-secondary)]">
                    {formatDate(o.dueDate)}
                  </td>
                  <td className="max-w-[22rem] whitespace-pre-line px-2 py-2 text-xs text-[var(--text-secondary)]">
                    {o.counterpartyRequisitesText || "—"}
                  </td>
                  <td className="max-w-[14rem] px-2 py-2 text-xs text-[var(--text-secondary)]">
                    {o.legalEntity || "—"}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {o.listPendingChatCorrections || o.listCompositionMismatch ? (
                        <Pill href={financeOfficeListHref({ tag: LIST_TAG_ORDER_ATTENTION })} kind="warn">
                          Корректировки
                        </Pill>
                      ) : null}
                      {o.listPendingProstheticsRequests ? (
                        <Pill href={financeOfficeListHref({ tag: LIST_TAG_PROSTHETICS_PENDING })} kind="sky">
                          Заказ протетики
                        </Pill>
                      ) : null}
                      <Pill
                        href={financeOfficeListHref({
                          tag: o.financeCalculated
                            ? LIST_TAG_FINANCE_CALCULATED
                            : LIST_TAG_FINANCE_NOT_CALCULATED,
                        })}
                        kind={o.financeCalculated ? "green" : "muted"}
                      >
                        {o.financeCalculated ? "Просчитано" : "Не просчитано"}
                      </Pill>
                      {payment === ORDER_PAYMENT_PAID ? (
                        <Pill href={financeOfficeListHref({ tag: LIST_TAG_PAYMENT_PAID })} kind="green">
                          Оплачено
                        </Pill>
                      ) : payment === ORDER_PAYMENT_PARTIAL ? (
                        <Pill href={financeOfficeListHref({ tag: LIST_TAG_PAYMENT_PARTIAL })} kind="amber">
                          Частично
                        </Pill>
                      ) : (
                        <Pill href={financeOfficeListHref({ tag: LIST_TAG_PAYMENT_EXPECTED })} kind="muted">
                          Не оплачено
                        </Pill>
                      )}
                    </div>
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
