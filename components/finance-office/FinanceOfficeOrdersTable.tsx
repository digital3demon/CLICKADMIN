"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { StickyListChrome } from "@/components/layout/StickyListChrome";
import { orderPathById } from "@/lib/order-public-ref";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { OrderListDueCell } from "@/components/orders/OrderListDueCell";
import { OrderShippedToggle } from "@/components/orders/OrderShippedToggle";
import { OrderListTagsCell } from "@/components/orders/OrderListTagsCell";

export type FinanceOfficeOrderTableRow = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  createdAt: string;
  legalEntity: string | null;
  dueDate: string | null;
  kaitenCardId: number | null;
  kaitenColumnTitle: string | null;
  demoKanbanColumn: string | null;
  kaitenCardType: { name: string } | null;
  clinic: { id: string; name: string; address: string | null } | null;
  counterpartyRequisitesText: string | null;
  doctor: { id: string; fullName: string };
  payment: string | null;
  paymentPartialRub: number | null;
  adminShippedOtpr: boolean;
  financeCalculated: boolean;
  kaitenBlocked: boolean;
  kaitenBlockReason: string | null;
  isUrgent: boolean;
  urgentCoefficient: number | null;
  invoiceAttachmentId: string | null;
  invoicePrinted: boolean;
  prostheticsOrdered: boolean;
  listCustomTags: Array<{ id: string; label: string }>;
  listCompositionMismatch: boolean;
  listPendingChatCorrections: boolean;
  listPendingProstheticsRequests: boolean;
};

export function FinanceOfficeOrdersTable({
  orders,
  activeTag = null,
  tab,
  periodFrom,
  periodTo,
  q = "",
  toolbar = null,
}: {
  orders: FinanceOfficeOrderTableRow[];
  activeTag?: string | null;
  tab: string;
  periodFrom: string | null;
  periodTo: string | null;
  q?: string | null;
  toolbar?: ReactNode;
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
      <StickyListChrome
        className="w-full min-w-0 overflow-y-visible"
        toolbarClassName="pb-3"
        toolbar={<div className="space-y-4">{toolbar}</div>}
      >
        <p className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
          В ФинОтделе нет нарядов по текущему фильтру.
        </p>
      </StickyListChrome>
    );
  }

  return (
    <StickyListChrome
      className="w-full min-w-0 overflow-y-visible"
      toolbarClassName="pb-3"
      toolbar={
        <div className="space-y-4">
          {toolbar}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2">
            <div className="text-sm font-medium text-[var(--text-body)]">
              Нарядов: {orders.length} · выбрано: {selected.size}
              {activeTag ? <span className="ml-2 text-[var(--text-muted)]">Фильтр: {activeTag}</span> : null}
            </div>
          </div>
        </div>
      }
    >
      <div className="w-full min-w-0 overflow-x-auto overflow-y-visible rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm [-webkit-overflow-scrolling:touch]">
        <table className="w-max min-w-full border-collapse text-left text-sm">
          <thead className="xl:sticky xl:top-[var(--sticky-list-toolbar-height,0px)] xl:z-30">
            <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              <th className="px-2 py-2 text-center normal-case">
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleAllVisible}
                    className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-[11px] font-semibold text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)]"
                  >
                    {allVisibleSelected ? "Снять видимые" : "Выбрать все видимые"}
                  </button>
                  <span>Выбрать</span>
                </div>
              </th>
              <th className="px-2 py-2 text-center">№ наряда</th>
              <th className="px-2 py-2 text-center">Клиника</th>
              <th className="px-2 py-2 text-center">Врач</th>
              <th className="px-2 py-2 text-center">Пациент</th>
              <th className="px-2 py-2 text-center">Лаборатория</th>
              <th className="w-[11rem] px-1.5 py-2 text-center normal-case">Реквизиты</th>
              <th className="w-[7rem] px-1.5 py-2 text-center normal-case">Наше юрлицо</th>
              <th className="w-[4.5rem] px-1 py-2 text-center normal-case">Отправка</th>
              <th className="w-[10.5rem] px-1.5 py-2 text-center normal-case">Отметки</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const workSent = o.adminShippedOtpr;
              return (
                <tr
                  key={o.id}
                  className={
                    workSent
                      ? "border-b-2 border-emerald-400/55 bg-emerald-300/55 text-emerald-950/90 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100/85 [&>td:not(:first-child):not(:last-child):not([data-shipped-cell])]:opacity-[0.28] [&>td:not(:first-child):not(:last-child):not([data-shipped-cell])]:saturate-[0.65] [&>td:last-child]:opacity-[0.88]"
                      : "border-b border-[var(--card-border)] transition-colors hover:bg-[var(--table-row-hover)]"
                  }
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
                    <OrderListDueCell
                      orderId={o.id}
                      dueIso={o.dueDate}
                      createdAtIso={o.createdAt}
                    />
                  </td>
                  <td className="w-[11rem] max-w-[11rem] whitespace-pre-line break-words px-1.5 py-2 text-[11px] leading-snug text-[var(--text-secondary)]">
                    {o.counterpartyRequisitesText || "—"}
                  </td>
                  <td className="w-[7rem] max-w-[7rem] break-words px-1.5 py-2 text-[11px] leading-snug text-[var(--text-secondary)]">
                    {o.legalEntity || "—"}
                  </td>
                  <td
                    data-shipped-cell
                    className="w-[4.5rem] px-1 py-2 text-center align-middle"
                  >
                    <OrderShippedToggle orderId={o.id} shipped={workSent} />
                  </td>
                  <td className="w-[10.5rem] max-w-[10.5rem] px-1.5 py-2">
                    <OrderListTagsCell
                      orderId={o.id}
                      pageSize={500}
                      orderAttentionWarning={
                        o.listCompositionMismatch || o.listPendingChatCorrections
                      }
                      kaitenCardId={o.kaitenCardId}
                      demoKanbanColumn={o.demoKanbanColumn}
                      demoCardTypeName={o.kaitenCardType?.name ?? null}
                      kaitenColumnTitle={o.kaitenColumnTitle}
                      prostheticsOrdered={o.prostheticsOrdered}
                      listPendingProstheticsRequests={o.listPendingProstheticsRequests}
                      invoicePrinted={o.invoicePrinted}
                      hasInvoiceAttachment={o.invoiceAttachmentId != null}
                      invoiceAttachmentId={o.invoiceAttachmentId}
                      payment={o.payment}
                      paymentPartialRub={o.paymentPartialRub}
                      adminShippedOtpr={o.adminShippedOtpr}
                      kaitenBlocked={o.kaitenBlocked === true}
                      kaitenBlockReason={o.kaitenBlockReason}
                      isUrgent={o.isUrgent}
                      urgentCoefficient={o.urgentCoefficient}
                      customTags={o.listCustomTags}
                      financeOfficeFilterContext={{ tab, periodFrom, periodTo, q }}
                      financeCalculated={o.financeCalculated}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </StickyListChrome>
  );
}
