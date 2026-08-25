"use client";

import { startTransition, useMemo, type ReactNode } from "react";
import { StickyListChrome } from "@/components/layout/StickyListChrome";
import { OrderListKaitenPoller } from "@/components/orders/OrderListKaitenPoller";
import { useSessionUser } from "@/components/providers/SessionUserProvider";
import { canSeeOrderNotificationKind } from "@/lib/auth/permissions";
import { FinanceOfficeDateFilterHeaders } from "@/components/finance-office/FinanceOfficeDateFilterHeaders";
import { FinanceOfficeOrderRow } from "@/components/finance-office/FinanceOfficeOrderRow";
import type { OrdersShipmentMode } from "@/lib/orders-shipment-list-query";
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
  clinicUsesPaperDocs: boolean;
  kaitenBlocked: boolean;
  kaitenBlockReason: string | null;
  isUrgent: boolean;
  urgentCoefficient: number | null;
  invoiceAttachmentId: string | null;
  invoiceIssued: boolean;
  /** ISO даты выставления счёта (ручная или загрузка файла). */
  invoiceIssuedAt: string | null;
  invoiceNumber: string | null;
  invoicePrinted: boolean;
  updAttachmentId: string | null;
  updNumber: string | null;
  updPrinted: boolean;
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
  listTag = null,
  tab,
  periodFrom,
  periodTo,
  q = "",
  shipMode = null,
  shipFrom = null,
  shipTo = null,
  exportHref,
  toolbar = null,
}: {
  orders: FinanceOfficeOrderTableRow[];
  activeTag?: string | null;
  listTag?: string | null;
  tab: string;
  periodFrom: string | null;
  periodTo: string | null;
  q?: string | null;
  shipMode?: OrdersShipmentMode | null;
  shipFrom?: string | null;
  shipTo?: string | null;
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
  const orderIdsWithUpd = useMemo(
    () => orders.filter((o) => o.updAttachmentId).map((o) => o.id),
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
                  orderIdsWithUpd={orderIdsWithUpd}
                />
              </div>
            ) : null}
          </div>
        </div>
      }
    >
      <OrderListKaitenPoller orderIds={kaitenOrderIds} />
      <div className="relative">
      <div className="w-full min-w-0">
        <table className="finance-office-orders-table w-full min-w-0 table-fixed border-separate border-spacing-0 text-center text-sm">
          <thead className="hidden shell-laptop:table-header-group">
            <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              <th className="w-[7.5rem] px-2 py-1.5 text-center normal-case">
                <button
                  type="button"
                  onClick={toggleAllVisible}
                  className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-[11px] font-semibold text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)]"
                >
                  {allVisibleSelected ? "Снять видимые" : "Выбрать видимые"}
                </button>
              </th>
              <th className="w-10 px-2 py-2 text-center normal-case">Чат</th>
              <th className="px-2 py-2 text-center">№ наряда</th>
              <th className="min-w-0 px-2 py-2 text-center">Клиника</th>
              <th className="min-w-0 px-2 py-2 text-center">Врач</th>
              <th className="min-w-0 px-2 py-2 text-center">Пациент</th>
              <th
                className="min-w-0 w-[8%] px-2 py-2 text-center normal-case"
                title="Дата выставления / отправки счёта"
              >
                Счёт выставлен
              </th>
              <FinanceOfficeDateFilterHeaders
                appliedFrom={periodFrom}
                appliedTo={periodTo}
                shipMode={shipMode}
                appliedShipFrom={shipFrom}
                appliedShipTo={shipTo}
                ctx={{ tab, tag: listTag, q }}
              />
              <th className="hidden min-w-0 px-2 py-2 text-center normal-case shell-desktop:table-cell">Реквизиты</th>
              <th className="hidden min-w-0 px-2 py-2 text-center normal-case shell-desktop:table-cell">Наше юрлицо</th>
              <th className="min-w-0 w-[5%] px-2 py-2 text-center normal-case">Отправка</th>
              <th className="min-w-0 px-2 py-2 text-center normal-case">Отметки</th>
              <th className="w-[5rem] px-2 py-2 text-center normal-case shell-desktop:hidden">Ещё</th>
            </tr>
          </thead>
          <tbody className="[&>tr:first-child>td]:pt-2">
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
                shipMode={shipMode}
                shipFrom={shipFrom}
                shipTo={shipTo}
                canSeeAdminIndicators={canSeeAdminIndicators}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div
        className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-12 bg-gradient-to-l from-[var(--card-bg)] to-transparent shell-laptop:hidden"
        aria-hidden="true"
      />
      </div>
    </StickyListChrome>
  );
}
