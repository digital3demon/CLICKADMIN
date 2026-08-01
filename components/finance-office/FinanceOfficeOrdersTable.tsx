"use client";

import Link from "next/link";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { StickyListChrome } from "@/components/layout/StickyListChrome";
import { OrderListKaitenColumnTag } from "@/components/orders/OrderListKaitenColumnTag";
import { OrderListOrderChatCell } from "@/components/orders/OrderListOrderChatCell";
import { OrderListAdminMemoCell } from "@/components/orders/OrderListAdminMemoCell";
import { OrderListKaitenPoller } from "@/components/orders/OrderListKaitenPoller";
import { useSessionUser } from "@/components/providers/SessionUserProvider";
import { canSeeOrderNotificationKind } from "@/lib/auth/permissions";
import { orderPathById } from "@/lib/order-public-ref";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { OrderListDueCell } from "@/components/orders/OrderListDueCell";
import { OrderShippedToggle } from "@/components/orders/OrderShippedToggle";
import { OrderListTagsCell } from "@/components/orders/OrderListTagsCell";
import { ORDER_SHIPPED_ROW_CLASS } from "@/lib/order-shipped-row-class";
import { financeOfficeListHref } from "@/lib/finance-office-list-query";
import { listTagKaitenColumnTitle, LIST_TAG_KAITEN_BLOCKED } from "@/lib/order-list-tag-filter";

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
  demoKanbanColumn: string | null;
  kaitenCardType: { name: string } | null;
  clinic: { id: string; name: string; address: string | null } | null;
  counterpartyRequisitesText: string | null;
  doctor: { id: string; fullName: string };
  payment: string | null;
  paymentPartialRub: number | null;
  adminShippedOtpr: boolean;
  financeCalculated: boolean;
  clinicWorksWithEdo: boolean;
  kaitenBlocked: boolean;
  kaitenBlockReason: string | null;
  isUrgent: boolean;
  urgentCoefficient: number | null;
  invoiceAttachmentId: string | null;
  invoicePrinted: boolean;
  invoicePaperDocs: boolean;
  invoiceSentToEdo: boolean;
  invoiceEdoSigned: boolean;
  prostheticsOrdered: boolean;
  listAdminMemo: string | null;
  listCustomTags: Array<{ id: string; label: string }>;
  listCompositionMismatch: boolean;
  listPendingChatCorrections: boolean;
  listPendingProstheticsRequests: boolean;
  listKaitenLabMentionHighlight: boolean;
};

function formatFinanceCardDate(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

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
  const { user } = useSessionUser();
  const canSeeAdminIndicators = canSeeOrderNotificationKind(
    "admin",
    user?.role,
    user?.moduleAccess,
  );
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
      className="w-full max-w-full min-w-0 overflow-y-visible rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm"
      toolbarClassName="rounded-t-lg bg-[var(--card-bg)] pb-0"
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
      <OrderListKaitenPoller
        orderIds={orders
          .filter((o) => o.kaitenCardId != null)
          .map((o) => o.id)}
      />
      <div className="relative">
      <div className="scrollbar-none w-full min-w-0 overflow-x-auto overflow-y-visible shell-desktop:overflow-x-visible [-webkit-overflow-scrolling:touch]">
        <table className="w-max min-w-full border-collapse text-center text-sm">
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
              <th
                className="w-[7.5rem] px-1 py-2 text-center normal-case max-xl:hidden"
                title="Пометки смен (не уходят в наряд и Kaiten)"
              >
                Пометки
              </th>
              <th className="w-10 px-1 py-2 text-center normal-case max-xl:hidden">Чат</th>
              <th className="px-2 py-2 text-center max-xl:sticky max-xl:left-[7.5rem] max-xl:z-30 max-xl:bg-[var(--surface-subtle)] max-xl:shadow-[1px_0_0_var(--card-border)]">№ наряда</th>
              <th className="px-2 py-2 text-center">Клиника</th>
              <th className="px-2 py-2 text-center">Врач</th>
              <th className="px-2 py-2 text-center">Пациент</th>
              <th className="px-2 py-2 text-center">Запись</th>
              <th className="w-[11rem] px-1.5 py-2 text-center normal-case max-xl:hidden">Реквизиты</th>
              <th className="w-[7rem] px-1.5 py-2 text-center normal-case max-xl:hidden">Наше юрлицо</th>
              <th className="w-[4.5rem] px-1 py-2 text-center normal-case">Отправка</th>
              <th className="w-[12rem] px-1.5 py-2 text-center normal-case">Отметки</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const workSent = o.adminShippedOtpr;
              const clinicName = o.clinic?.name ?? "Частное лицо";
              const doctorName = personNameSurnameInitials(o.doctor.fullName);
              const patientName = o.patientName
                ? personNameSurnameInitials(o.patientName)
                : "";
              const labDate = formatFinanceCardDate(
                o.appointmentDate ?? o.dueToAdminsAt,
              );
              const kaitenColTrimmed = o.kaitenColumnTitle?.trim() ?? "";
              const blocked = o.kaitenBlocked === true;
              const kaitenStatusFilterHref = blocked
                ? financeOfficeListHref({
                    tab,
                    tag: LIST_TAG_KAITEN_BLOCKED,
                    from: periodFrom ?? undefined,
                    to: periodTo ?? undefined,
                    q: (q ?? "").trim() || undefined,
                  })
                : kaitenColTrimmed
                  ? financeOfficeListHref({
                      tab,
                      tag: listTagKaitenColumnTitle(kaitenColTrimmed),
                      from: periodFrom ?? undefined,
                      to: periodTo ?? undefined,
                      q: (q ?? "").trim() || undefined,
                    })
                  : null;
              const rowClass = workSent
                ? ORDER_SHIPPED_ROW_CLASS
                : "border-b border-[var(--card-border)] transition-colors hover:bg-[var(--table-row-hover)]";
              const renderTagsCell = () => (
                <OrderListTagsCell
                  orderId={o.id}
                  pageSize={500}
                  orderAttentionWarning={
                    o.listCompositionMismatch || o.listPendingChatCorrections
                  }
                  listPendingChatCorrections={o.listPendingChatCorrections}
                  listCompositionMismatch={o.listCompositionMismatch}
                  kaitenCardId={o.kaitenCardId}
                  demoKanbanColumn={o.demoKanbanColumn}
                  demoCardTypeName={o.kaitenCardType?.name ?? null}
                  kaitenColumnTitle={o.kaitenColumnTitle}
                  prostheticsOrdered={o.prostheticsOrdered}
                  listPendingProstheticsRequests={o.listPendingProstheticsRequests}
                  invoicePrinted={o.invoicePrinted}
                  hasInvoiceAttachment={o.invoiceAttachmentId != null}
                  invoiceAttachmentId={o.invoiceAttachmentId}
                  invoicePaperDocs={o.invoicePaperDocs}
                  invoiceSentToEdo={o.invoiceSentToEdo}
                  invoiceEdoSigned={o.invoiceEdoSigned}
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
                  clinicWorksWithEdo={o.clinicWorksWithEdo}
                  omitKaitenColumnTag
                />
              );
              return (
                <Fragment key={o.id}>
                <tr className={`hidden shell-desktop:table-row ${rowClass}`}>
                  <td className="w-[7.5rem] px-2 py-2 text-center max-xl:sticky max-xl:left-0 max-xl:z-20 max-xl:bg-[var(--card-bg)] max-xl:shadow-[1px_0_0_var(--card-border)]">
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
                  <td className="max-xl:hidden w-[7.5rem] px-1 py-1.5 text-center align-middle">
                    <OrderListAdminMemoCell
                      orderId={o.id}
                      initialMemo={o.listAdminMemo}
                    />
                  </td>
                  <OrderListOrderChatCell
                    orderId={o.id}
                    orderNumber={o.orderNumber}
                    patientName={patientName || undefined}
                    doctorName={doctorName || undefined}
                    labMentionHighlight={
                      canSeeAdminIndicators && o.listKaitenLabMentionHighlight
                    }
                  />
                  <td className="whitespace-nowrap px-2 py-2 text-center font-mono font-semibold max-xl:sticky max-xl:left-[7.5rem] max-xl:z-10 max-xl:bg-[var(--card-bg)] max-xl:shadow-[1px_0_0_var(--card-border)]">
                    <div className="flex min-h-[2.5rem] flex-col items-center justify-center gap-0.5 -translate-y-px">
                      <Link
                        href={orderPathById(o.id)}
                        className="whitespace-nowrap font-mono text-[11px] font-semibold leading-none text-[var(--sidebar-blue)] hover:underline sm:text-xs"
                        title={`${o.orderNumber} — открыть наряд`}
                      >
                        {o.orderNumber}
                      </Link>
                      <OrderListKaitenColumnTag
                        kaitenCardId={o.kaitenCardId}
                        demoKanbanColumn={o.demoKanbanColumn}
                        demoCardTypeName={o.kaitenCardType?.name ?? null}
                        kaitenColumnTitle={o.kaitenColumnTitle}
                        kaitenBlocked={blocked}
                        kaitenBlockReason={o.kaitenBlockReason}
                        filterHref={kaitenStatusFilterHref}
                        placement="underOrderNumber"
                      />
                    </div>
                  </td>
                  <td className="max-w-[13rem] px-2 py-2 text-center align-middle">
                    {o.clinic ? (
                      <Link
                        href={`/clients/${o.clinic.id}`}
                        className="block hyphens-auto break-words text-center text-[var(--sidebar-blue)] hover:underline"
                      >
                        {o.clinic.name}
                      </Link>
                    ) : (
                      <span className="block break-words text-center text-[var(--text-secondary)]">
                        Частное лицо
                      </span>
                    )}
                  </td>
                  <td className="max-w-[10rem] px-2 py-2 text-center align-middle">
                    <Link
                      href={`/clients/doctors/${o.doctor.id}`}
                      className="block break-words text-center text-[var(--sidebar-blue)] hover:underline"
                    >
                      {personNameSurnameInitials(o.doctor.fullName)}
                    </Link>
                  </td>
                  <td className="max-w-[10rem] px-2 py-2 text-center align-middle">
                    <span className="block hyphens-auto break-words text-center">
                      {o.patientName
                        ? personNameSurnameInitials(o.patientName)
                        : "—"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-center align-middle text-[var(--text-secondary)]">
                    <div className="flex justify-center">
                      <OrderListDueCell
                        orderId={o.id}
                        dueIso={o.appointmentDate ?? o.dueToAdminsAt}
                        createdAtIso={o.createdAt}
                        variant="appointment"
                      />
                    </div>
                  </td>
                  <td className="w-[11rem] max-w-[11rem] whitespace-pre-line break-words px-1.5 py-2 text-center text-[11px] leading-snug text-[var(--text-secondary)] max-xl:hidden">
                    {o.counterpartyRequisitesText || "—"}
                  </td>
                  <td className="w-[7rem] max-w-[7rem] break-words px-1.5 py-2 text-center text-[11px] leading-snug text-[var(--text-secondary)] max-xl:hidden">
                    {o.legalEntity || "—"}
                  </td>
                  <td
                    data-shipped-cell
                    className="w-[4.5rem] px-1 py-2 text-center align-middle"
                  >
                    <OrderShippedToggle orderId={o.id} shipped={workSent} />
                  </td>
                  <td className="w-[12rem] max-w-[12rem] px-1.5 py-2 text-left align-top">
                    {renderTagsCell()}
                  </td>
                </tr>
                <tr className="border-b border-[var(--card-border)] shell-desktop:hidden print:hidden">
                  <td colSpan={99} className="p-0">
                    <div className="p-3">
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-col items-start gap-1">
                          <Link
                            href={orderPathById(o.id)}
                            className="font-mono text-base font-bold leading-none text-[var(--sidebar-blue)] hover:underline"
                            title={`${o.orderNumber} — открыть наряд`}
                          >
                            № {o.orderNumber}
                          </Link>
                          <OrderListKaitenColumnTag
                            kaitenCardId={o.kaitenCardId}
                            demoKanbanColumn={o.demoKanbanColumn}
                            demoCardTypeName={o.kaitenCardType?.name ?? null}
                            kaitenColumnTitle={o.kaitenColumnTitle}
                            kaitenBlocked={blocked}
                            kaitenBlockReason={o.kaitenBlockReason}
                            filterHref={kaitenStatusFilterHref}
                            placement="underOrderNumber"
                          />
                        </div>
                        {labDate ? (
                          <span className="mt-0.5 shrink-0 text-xs text-[var(--text-muted)]">
                            {labDate}
                          </span>
                        ) : null}
                      </div>

                      <div className="mb-0.5 truncate text-xs font-normal text-[var(--text-secondary)]">
                        {clinicName}
                      </div>

                      <div className="mb-2 max-w-[12rem]">
                        <OrderListAdminMemoCell
                          orderId={o.id}
                          initialMemo={o.listAdminMemo}
                        />
                      </div>

                      <div className="mb-1.5 flex flex-wrap gap-1.5 text-sm font-semibold text-[var(--app-text)]">
                        {doctorName ? <span>{doctorName}</span> : null}
                        {doctorName && patientName ? (
                          <span className="text-[var(--text-muted)]">·</span>
                        ) : null}
                        {patientName ? <span>{patientName}</span> : null}
                      </div>

                      {o.counterpartyRequisitesText?.trim() ? (
                        <div className="mb-2 text-xs leading-snug text-[var(--text-secondary)]">
                          {o.counterpartyRequisitesText.trim()}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2 [&_button]:min-h-[44px] [&_button]:min-w-[44px]">
                        <OrderListOrderChatCell
                          orderId={o.id}
                          orderNumber={o.orderNumber}
                          patientName={patientName || undefined}
                          doctorName={doctorName || undefined}
                          labMentionHighlight={
                      canSeeAdminIndicators && o.listKaitenLabMentionHighlight
                    }
                          embedded
                        />
                        <label className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2">
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
                        </label>
                        <Link
                          href={orderPathById(o.id)}
                          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-sm font-medium text-[var(--text-strong)] active:bg-[var(--surface-hover)]"
                          title={`${o.orderNumber} — открыть наряд`}
                        >
                          Открыть
                        </Link>
                        <div className="min-h-[44px] flex-1 rounded-lg bg-[var(--surface-subtle)] px-2 py-1">
                          <OrderShippedToggle orderId={o.id} shipped={workSent} />
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-[var(--text-secondary)] [&_.order-list-tags-pack]:items-center">
                        {renderTagsCell()}
                      </div>
                    </div>
                  </td>
                </tr>
                </Fragment>
              );
            })}
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
