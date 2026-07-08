"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClientOrderPreviewButton } from "@/components/clients/ClientOrderPreviewButton";
import {
  filterClientCardOrders,
  type ClientCardOrderItem,
} from "@/lib/client-card-order-search";

const inputClass =
  "w-full min-w-[12rem] max-w-sm rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm placeholder:text-[var(--text-placeholder)] focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

type Props = {
  variant: "clinic" | "doctor";
  orders: ClientCardOrderItem[];
  totalOrders: number;
  emptyMessage: string;
};

export function ClientCardOrdersTable({
  variant,
  orders,
  totalOrders,
  emptyMessage,
}: Props) {
  const [query, setQuery] = useState("");
  const shownOrders = orders.length;
  const hasMoreOrders = totalOrders > shownOrders;
  const filtered = useMemo(
    () => filterClientCardOrders(orders, query, variant),
    [orders, query, variant],
  );
  const searchActive = query.trim().length > 0;

  const placeholder =
    variant === "clinic"
      ? "Поиск: номер, врач, пациент, этап…"
      : "Поиск: номер, клиника, пациент, этап…";

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="min-w-0 shrink-0">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Заказы
            {totalOrders > 0 ? (
              <span className="ml-1.5 font-semibold tabular-nums normal-case text-[var(--app-text)]">
                · всего {totalOrders}
              </span>
            ) : null}
          </h2>
          {hasMoreOrders && !searchActive ? (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              В таблице — последние {shownOrders}
            </p>
          ) : null}
          {searchActive ? (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Найдено {filtered.length} из {shownOrders}
              {hasMoreOrders ? " в таблице" : ""}
            </p>
          ) : null}
        </div>
        {orders.length > 0 ? (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label="Поиск по заказам"
            className={`${inputClass} ml-auto`}
          />
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
        <table
          className={`w-full border-collapse text-left text-sm ${
            variant === "clinic" ? "min-w-[860px]" : "min-w-[920px]"
          }`}
        >
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              <th className="px-3 py-3">Номер</th>
              <th className="px-3 py-3">
                {variant === "clinic" ? "Врач" : "Клиника"}
              </th>
              <th className="px-3 py-3">Пациент</th>
              <th className="px-3 py-3">Этап</th>
              <th className="px-3 py-3">Срочно</th>
              <th className="px-3 py-3">Создан</th>
              <th className="px-3 py-3">Дата отгрузки</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-[var(--text-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-[var(--text-muted)]"
                >
                  По запросу «{query.trim()}» заказов не найдено.
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--table-row-hover)]"
                >
                  <td className="px-3 py-2.5">
                    <ClientOrderPreviewButton
                      orderId={o.id}
                      orderNumber={o.orderNumber}
                    />
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2.5 text-[var(--text-strong)]">
                    {variant === "clinic" ? (
                      o.doctorName ?? "—"
                    ) : o.clinicId && o.clinicName ? (
                      <Link
                        href={`/clients/${o.clinicId}`}
                        className="text-[var(--sidebar-blue)] hover:underline"
                      >
                        {o.clinicName}
                      </Link>
                    ) : (
                      <span className="text-[var(--text-muted)]">
                        Частная практика
                      </span>
                    )}
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2.5 text-[var(--text-body)]">
                    {o.patientName ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--text-strong)]">
                    {o.stageLabel}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--text-body)]">
                    {o.urgentLabel}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">
                    {o.createdAtLabel}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">
                    {o.shippedAtLabel}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
