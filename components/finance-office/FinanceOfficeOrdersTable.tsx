"use client";

import { startTransition, useMemo, type ReactNode } from "react";
import { StickyListChrome } from "@/components/layout/StickyListChrome";
import { useSessionUser } from "@/components/providers/SessionUserProvider";
import { canSeeOrderNotificationKind } from "@/lib/auth/permissions";
import { FinanceOfficeDateFilterHeaders } from "@/components/finance-office/FinanceOfficeDateFilterHeaders";
import { FinanceOfficeOrderRow } from "@/components/finance-office/FinanceOfficeOrderRow";
import type { OrdersShipmentMode } from "@/lib/orders-shipment-list-query";
import { FinanceOfficePrintInvoicesButton } from "@/components/finance-office/FinanceOfficePrintInvoicesButton";
import { FinanceOfficeExportButton } from "@/components/finance-office/FinanceOfficeExportButton";
import { useFinanceOfficeSelection } from "@/components/finance-office/finance-office-selection";
import { CrmModuleListSnapshotWriter } from "@/components/layout/CrmModuleListSnapshotWriter";

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
  totalCount,
  activeTag = null,
  listTag = null,
  tab,
  periodFrom,
  periodTo,
  q = "",
  shipMode = null,
  shipFrom = null,
  shipTo = null,
  invFrom = null,
  invTo = null,
  toolbar = null,
  children,
}: {
  orders: FinanceOfficeOrderTableRow[];
  /** Всего по фильтру (все страницы). Пилюли считают тот же объём отдельно. */
  totalCount?: number;
  activeTag?: string | null;
  listTag?: string | null;
  tab: string;
  periodFrom: string | null;
  periodTo: string | null;
  q?: string | null;
  shipMode?: OrdersShipmentMode | null;
  shipFrom?: string | null;
  shipTo?: string | null;
  invFrom?: string | null;
  invTo?: string | null;
  toolbar?: ReactNode;
  /** C4 pilot: server-rendered tbody (островки интерактива внутри строк). */
  children?: ReactNode;
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
  const toggleAllVisible = () => {
    const on = !allVisibleSelected;
    startTransition(() => {
      selectVisible(visibleIds, on);
    });
  };
  const snapshotRows = useMemo(
    () =>
      orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        patientName: o.patientName ?? "",
        doctorName: o.doctor.fullName,
        clinicName: o.clinic?.name ?? "",
        columnTitle: o.kaitenColumnTitle ?? "",
        payment: o.payment ?? "",
      })),
    [orders],
  );

  const headerRow = (
    <FinanceOfficeTableHeaderRow
      interactive
      allVisibleSelected={allVisibleSelected}
      onToggleAllVisible={toggleAllVisible}
      periodFrom={periodFrom}
      periodTo={periodTo}
      shipMode={shipMode}
      shipFrom={shipFrom}
      shipTo={shipTo}
      invFrom={invFrom}
      invTo={invTo}
      tab={tab}
      listTag={listTag}
      q={q}
    />
  );

  if (orders.length === 0) {
    return (
      <StickyListChrome
        className="w-full min-w-0 overflow-y-visible"
        toolbarClassName="pb-3"
        toolbar={<div className="space-y-4">{toolbar}</div>}
      >
        <CrmModuleListSnapshotWriter rows={snapshotRows} />
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
        <div>
          {toolbar}
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2">
            <div className="text-sm font-medium text-[var(--text-body)]">
              Нарядов: {totalCount ?? orders.length} · выбрано: {selectedCount}
              {activeTag ? (
                <span className="ml-2 text-[var(--text-muted)]">
                  Фильтр: {activeTag}
                </span>
              ) : null}
            </div>
            {selectedCount > 0 ? (
              <div className="ms-auto flex flex-wrap items-center gap-2">
                <FinanceOfficeExportButton />
                <FinanceOfficePrintInvoicesButton
                  orderIdsWithInvoice={orderIdsWithInvoice}
                  orderIdsWithUpd={orderIdsWithUpd}
                />
              </div>
            ) : null}
          </div>
          <div className="orders-list-mirror-thead hidden w-full min-w-0 overflow-x-auto overflow-y-hidden bg-[var(--surface-subtle)] shadow-[0_1px_0_var(--card-border)] [-webkit-overflow-scrolling:touch] shell-laptop:block print:hidden">
            <table className="finance-office-orders-table w-full min-w-0 table-fixed border-separate border-spacing-0 text-center text-sm">
              <FinanceOfficeTableColGroup />
              <thead>{headerRow}</thead>
            </table>
          </div>
        </div>
      }
    >
      <CrmModuleListSnapshotWriter rows={snapshotRows} />
      <div className="relative">
      <div className="w-full min-w-0">
        <table className="finance-office-orders-table w-full min-w-0 table-fixed border-separate border-spacing-0 text-center text-sm">
          <FinanceOfficeTableColGroup />
          <thead className="sr-only">
            <FinanceOfficeTableHeaderRow
              interactive={false}
              allVisibleSelected={allVisibleSelected}
              onToggleAllVisible={toggleAllVisible}
              periodFrom={periodFrom}
              periodTo={periodTo}
              shipMode={shipMode}
              shipFrom={shipFrom}
              shipTo={shipTo}
              invFrom={invFrom}
              invTo={invTo}
              tab={tab}
              listTag={listTag}
              q={q}
            />
          </thead>
          <tbody className="[&>tr:first-child>td]:pt-2">
            {children ??
              orders.map((o) => (
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
                  invFrom={invFrom}
                  invTo={invTo}
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

function FinanceOfficeTableColGroup() {
  return (
    <colgroup>
      <col className="w-[7.5rem]" />
      <col className="w-9" />
      <col className="w-[5.5rem]" />
      <col className="w-[11%]" />
      <col className="w-[7.25rem]" />
      <col className="w-[6.25rem]" />
      <col className="w-[6.5rem]" />
      <col className="w-[4.5rem]" />
      <col className="w-[4.5rem]" />
      <col className="hidden w-[8.5rem] shell-desktop:table-column" />
      <col className="hidden w-[4rem] shell-desktop:table-column" />
      <col className="w-[4.25rem]" />
      {/* Было ~1/9 leftover (~8%); +60% → ~13% таблицы. */}
      <col className="w-[13%]" />
      <col className="w-[4.5rem] shell-desktop:hidden" />
    </colgroup>
  );
}

function FinanceOfficeTableHeaderRow({
  interactive,
  allVisibleSelected,
  onToggleAllVisible,
  periodFrom,
  periodTo,
  shipMode,
  shipFrom,
  shipTo,
  invFrom,
  invTo,
  tab,
  listTag,
  q,
}: {
  interactive: boolean;
  allVisibleSelected: boolean;
  onToggleAllVisible: () => void;
  periodFrom: string | null;
  periodTo: string | null;
  shipMode: OrdersShipmentMode | null;
  shipFrom: string | null;
  shipTo: string | null;
  invFrom: string | null;
  invTo: string | null;
  tab: string;
  listTag: string | null;
  q: string | null | undefined;
}) {
  return (
    <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
      <th className="w-[7.5rem] px-1 py-1.5 text-center normal-case">
        {interactive ? (
          <button
            type="button"
            onClick={onToggleAllVisible}
            className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-[11px] font-semibold text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)]"
          >
            {allVisibleSelected ? "Снять видимые" : "Выбрать видимые"}
          </button>
        ) : (
          "Выбор"
        )}
      </th>
      <th className="w-9 px-1 py-2 text-center normal-case">Чат</th>
      <th className="w-[5.5rem] px-1 py-2 text-center">№ наряда</th>
      <th className="min-w-0 w-[11%] px-1 py-2 text-center">Клиника</th>
      <th className="min-w-0 w-[7.25rem] px-1 py-2 text-center">Врач</th>
      <th className="min-w-0 w-[6.25rem] px-1 py-2 text-center">Пациент</th>
      {interactive ? (
        <FinanceOfficeDateFilterHeaders
          appliedFrom={periodFrom}
          appliedTo={periodTo}
          shipMode={shipMode}
          appliedShipFrom={shipFrom}
          appliedShipTo={shipTo}
          appliedInvFrom={invFrom}
          appliedInvTo={invTo}
          ctx={{ tab, tag: listTag, q }}
        />
      ) : (
        <>
          <th className="min-w-0 w-[6.5rem] px-1 py-2 text-center normal-case">
            Счёт выставлен
          </th>
          <th className="min-w-0 w-[4.5rem] px-1 py-2 text-center normal-case">Лаб срок</th>
          <th className="min-w-0 w-[4.5rem] px-1 py-2 text-center normal-case">Запись</th>
        </>
      )}
      <th className="hidden min-w-0 w-[8.5rem] px-1 py-2 text-center normal-case shell-desktop:table-cell">
        Реквизиты
      </th>
      <th className="hidden min-w-0 w-[4rem] px-1 py-2 text-center normal-case shell-desktop:table-cell">
        Наше юрлицо
      </th>
      <th className="min-w-0 w-[4.25rem] px-1 py-2 text-center normal-case">
        Отправка
      </th>
      <th className="min-w-0 w-[13%] px-1 py-2 text-center normal-case">Отметки</th>
      <th className="w-[4.5rem] px-1 py-2 text-center normal-case shell-desktop:hidden">
        Ещё
      </th>
    </tr>
  );
}
