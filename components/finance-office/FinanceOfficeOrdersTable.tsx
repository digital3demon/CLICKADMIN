"use client";

import { startTransition, useMemo, type ReactNode } from "react";
import { StickyListChrome } from "@/components/layout/StickyListChrome";
import { OrderListKaitenPoller } from "@/components/orders/OrderListKaitenPoller";
import { useSessionUser } from "@/components/providers/SessionUserProvider";
import { canSeeOrderNotificationKind } from "@/lib/auth/permissions";
import { FinanceOfficeOrderRow } from "@/components/finance-office/FinanceOfficeOrderRow";
import { FinanceOfficePrintInvoicesButton } from "@/components/finance-office/FinanceOfficePrintInvoicesButton";
import { useFinanceOfficeSelection } from "@/components/finance-office/finance-office-selection";

export type FinanceOfficeOrderTableRow = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  createdAt: string;
  legalEntity: string | null;
  dueDate: string | null;
  appointmentDate: string | null;
  dueToAdminsAt: string | null;
  kaitenCardId: number | null;
  kaitenColumnTitle: string | null;
  kaitenTrackLane: string | null;
  demoKanbanColumn: string | null;
  kaitenCardType: { name: string } | null;
  clinic: { id: string; name: string; address: string | null } | null;
  counterpartyRequisitesText: string | null;
  doctor: { id: string; fullName: string };
  payment: string | null;
  paymentPartialRub: number | null;
  adminShippedOtpr: boolean;
  /** ISO `adminShippedAt` — дата/время отметки «Отправка». */
  adminShippedAt: string | null;
  financeCalculated: boolean;
  clinicWorksWithEdo: boolean;
  kaitenBlocked: boolean;
  kaitenBlockReason: string | null;
  isUrgent: boolean;
  urgentCoefficient: number | null;
  invoiceAttachmentId: string | null;
  invoiceIssued: boolean;
  invoiceNumber: string | null;
  invoicePrinted: boolean;
  invoicePaperDocs: boolean;
  invoiceSentToEdo: boolean;
  invoiceEdoSigned: boolean;
  prostheticsOrdered: boolean;
  listCustomTags: Array<{ id: string; label: string }>;
  listCompositionMismatch: boolean;
  listPendingChatCorrections: boolean;
  listPendingProstheticsRequests: boolean;
  listKaitenLabMentionHighlight: boolean;
};

export function FinanceOfficeOrdersTable({
  orders,
  activeTag = null,
  tab,
  periodFrom,
  periodTo,
  q = "",
  exportHref,
  toolbar = null,
}: {
  orders: FinanceOfficeOrderTableRow[];
  activeTag?: string | null;
  tab: string;
  periodFrom: string | null;
  periodTo: string | null;
  q?: string | null;
  exportHref?: string;
  toolbar?: ReactNode;
}) {
  const { user } = useSessionUser();
  const canSeeAdminIndicators = canSeeOrderNotificationKind(
    "admin",
    user?.role,
    user?.moduleAccess,
  );
  const { selected, selectedCount, toggleOne, selectVisible } =
    useFinanceOfficeSelection();
  const visibleIds = useMemo(() => orders.map((o) => o.id), [orders]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const orderIdsWithInvoice = useMemo(
    () => orders.filter((o) => o.invoiceAttachmentId).map((o) => o.id),
    [orders],
  );
  const kaitenOrderIds = useMemo(
    () => orders.filter((o) => o.kaitenCardId != null).map((o) => o.id),
    [orders],
  );

  const toggleAllVisible = () => {
    const on = !allVisibleSelected;
    startTransition(() => {
      selectVisible(visibleIds, on);
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
      className="w-full max-w-full min-w-0 overflow-y-visible rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm"
      toolbarClassName="rounded-t-lg bg-[var(--card-bg)] pb-0"
      toolbar={
        <div className="space-y-4">
          {toolbar}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2">
            <div className="text-sm font-medium text-[var(--text-body)]">
              Нарядов: {orders.length} · выбрано: {selectedCount}
              {activeTag ? (
                <span className="ml-2 text-[var(--text-muted)]">
                  Фильтр: {activeTag}
                </span>
              ) : null}
            </div>
            {selectedCount > 0 ? (
              <div className="ms-auto flex flex-wrap items-center gap-2">
                {exportHref ? (
                  <a
                    href={exportHref}
                    className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-emerald-100 dark:border-emerald-800/70 dark:bg-emerald-950/35 dark:text-emerald-100 dark:hover:bg-emerald-950/55"
                  >
                    Выгрузить
                  </a>
                ) : null}
                <FinanceOfficePrintInvoicesButton
                  orderIdsWithInvoice={orderIdsWithInvoice}
                />
              </div>
            ) : null}
          </div>
        </div>
      }
    >
      <OrderListKaitenPoller orderIds={kaitenOrderIds} />
      <div className="relative">
      <div className="scrollbar-none w-full min-w-0 overflow-x-auto overflow-y-visible shell-desktop:overflow-x-visible [-webkit-overflow-scrolling:touch]">
        <table className="finance-office-orders-table w-max min-w-full border-separate border-spacing-0 text-center text-sm">
          <thead className="hidden shell-desktop:table-header-group xl:sticky xl:top-[var(--sticky-list-toolbar-height,0px)] xl:z-30">
            <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              <th className="w-[7.5rem] px-2 py-2 text-center normal-case max-xl:sticky max-xl:left-0 max-xl:z-30 max-xl:bg-[var(--surface-subtle)] max-xl:shadow-[1px_0_0_var(--card-border)]">
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
              <th className="w-10 px-1 py-2 text-center normal-case max-xl:hidden">Чат</th>
              <th className="px-2 py-2 text-center max-xl:sticky max-xl:left-[7.5rem] max-xl:z-30 max-xl:bg-[var(--surface-subtle)] max-xl:shadow-[1px_0_0_var(--card-border)]">№ наряда</th>
              <th className="px-2 py-2 text-center">Клиника</th>
              <th className="px-2 py-2 text-center">Врач</th>
              <th className="px-2 py-2 text-center">Пациент</th>
              <th
                className="px-2 py-2 text-center"
                title="Лаб-срок: dueDate"
              >
                Лаб срок
              </th>
              <th
                className="px-2 py-2 text-center"
                title="Запись: дата и время приёма пациента"
              >
                Запись
              </th>
              <th className="w-[11rem] px-1.5 py-2 text-center normal-case max-xl:hidden">Реквизиты</th>
              <th className="w-[7rem] px-1.5 py-2 text-center normal-case max-xl:hidden">Наше юрлицо</th>
              <th className="w-[4.5rem] px-1 py-2 text-center normal-case">Отправка</th>
              <th className="w-[15.5rem] px-1.5 py-2 text-center normal-case">Отметки</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <FinanceOfficeOrderRow
                key={o.id}
                o={o}
                isSelected={selected.has(o.id)}
                onToggle={toggleOne}
                tab={tab}
                periodFrom={periodFrom}
                periodTo={periodTo}
                q={q}
                canSeeAdminIndicators={canSeeAdminIndicators}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div
        className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-12 bg-gradient-to-l from-[var(--card-bg)] to-transparent shell-desktop:hidden"
        aria-hidden="true"
      />
      </div>
    </StickyListChrome>
  );
}
