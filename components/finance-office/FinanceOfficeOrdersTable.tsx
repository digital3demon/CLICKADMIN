"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { StickyListChrome } from "@/components/layout/StickyListChrome";
import { OrderListKaitenColumnTag } from "@/components/orders/OrderListKaitenColumnTag";
import { OrderListOrderChatCell } from "@/components/orders/OrderListOrderChatCell";
import {
  OrderListAdminMemoCell,
  OrderListTechMemoCell,
} from "@/components/orders/OrderListAdminMemoCell";
import { canEditOrderListTechMemo } from "@/lib/auth/permissions";
import { OrderListKaitenPoller } from "@/components/orders/OrderListKaitenPoller";
import { useSessionUser } from "@/components/providers/SessionUserProvider";
import { canSeeOrderNotificationKind } from "@/lib/auth/permissions";
import { orderPathById } from "@/lib/order-public-ref";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { OrderShippedToggle } from "@/components/orders/OrderShippedToggle";
import { OrderListTagsCell } from "@/components/orders/OrderListTagsCell";
import {
  mergeOrderListRowClass,
  orderListMobileCardAccentClass,
  resolveOrderListRowAccentKind,
} from "@/lib/order-list-row-accent";
import {
  financeOfficeMobileCardTintClass,
  financeOfficeRowTintClass,
  resolveFinanceOfficeRowTintKind,
} from "@/lib/finance-office-row-tint";
import { financeOfficeListHref } from "@/lib/finance-office-list-query";
import {
  listTagKaitenColumnTitle,
  listTagKaitenTrackLaneOrNull,
  LIST_TAG_KAITEN_BLOCKED,
} from "@/lib/order-list-tag-filter";

function targetInsideInteractive(target: EventTarget | null) {
  if (target == null || !(target instanceof Node)) return false;
  const el =
    target instanceof Element ? target : (target.parentElement ?? null);
  if (!el) return false;
  return Boolean(
    el.closest(
      "a, button, input, select, textarea, label, [role='button'], [role='combobox'], [data-row-click-ignore]",
    ),
  );
}

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
  listAdminMemo: string | null;
  listTechMemo: string | null;
  listCustomTags: Array<{ id: string; label: string }>;
  listCompositionMismatch: boolean;
  listPendingChatCorrections: boolean;
  listPendingProstheticsRequests: boolean;
  listKaitenLabMentionHighlight: boolean;
};

/** Только отображение (без редактирования). */
function formatFinanceDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const router = useRouter();
  const { user } = useSessionUser();
  const canSeeAdminIndicators = canSeeOrderNotificationKind(
    "admin",
    user?.role,
    user?.moduleAccess,
  );
  const canEditTechMemo = user?.role
    ? canEditOrderListTechMemo(user.role)
    : false;
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
              <th
                className="w-[4.25rem] px-1 py-2 text-center normal-case max-xl:hidden"
                title="ПА — пометки админов (не уходят в наряд и Kaiten)"
              >
                ПА
              </th>
              <th
                className="w-[4.25rem] px-1 py-2 text-center normal-case max-xl:hidden"
                title="ПТ — пометки техники (не уходят в наряд и Kaiten)"
              >
                ПТ
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
            {orders.map((o) => {
              const workSent = o.adminShippedOtpr;
              const clinicName = o.clinic?.name ?? "Частное лицо";
              const doctorName = personNameSurnameInitials(o.doctor.fullName);
              const patientName = o.patientName
                ? personNameSurnameInitials(o.patientName)
                : "";
              const labDueLabel = formatFinanceCardDate(o.dueDate);
              const appointmentLabel = formatFinanceCardDate(
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
              const laneTag = listTagKaitenTrackLaneOrNull(o.kaitenTrackLane);
              const boardFilterHref = laneTag
                ? financeOfficeListHref({
                    tab,
                    tag: laneTag,
                    from: periodFrom ?? undefined,
                    to: periodTo ?? undefined,
                    q: (q ?? "").trim() || undefined,
                  })
                : null;
              const rowAccent = resolveOrderListRowAccentKind({
                listPendingChatCorrections: o.listPendingChatCorrections,
                listCompositionMismatch: o.listCompositionMismatch,
                listPendingProstheticsRequests:
                  o.listPendingProstheticsRequests,
                prostheticsOrdered: o.prostheticsOrdered,
              });
              const financeTint = resolveFinanceOfficeRowTintKind({
                financeCalculated: o.financeCalculated,
                invoiceIssued: o.invoiceIssued,
                invoiceNumber: o.invoiceNumber,
                invoiceAttachmentId: o.invoiceAttachmentId,
              });
              const rowClass = mergeOrderListRowClass({
                shipped: false,
                accent: rowAccent,
                shippedClass: "",
                idleClass: financeOfficeRowTintClass(financeTint),
              });
              const mobileCardAccent =
                orderListMobileCardAccentClass(rowAccent) ||
                financeOfficeMobileCardTintClass(financeTint);
              const stickyCellBg = rowAccent
                ? "max-xl:bg-[var(--card-bg)]"
                : financeTint
                  ? ""
                  : "max-xl:bg-[var(--card-bg)]";
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
                  kaitenTrackLane={o.kaitenTrackLane}
                  prostheticsOrdered={o.prostheticsOrdered}
                  listPendingProstheticsRequests={o.listPendingProstheticsRequests}
                  invoicePrinted={o.invoicePrinted}
                  hasInvoiceAttachment={o.invoiceAttachmentId != null}
                  invoiceNumber={o.invoiceNumber}
                  invoiceAttachmentId={o.invoiceAttachmentId}
                  invoicePaperDocs={o.invoicePaperDocs}
                  invoiceSentToEdo={o.invoiceSentToEdo}
                  invoiceEdoSigned={o.invoiceEdoSigned}
                  payment={o.payment}
                  paymentPartialRub={o.paymentPartialRub}
                  clinicId={o.clinic?.id ?? null}
                  doctorId={o.doctor?.id ?? null}
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
                  <td className={`w-[7.5rem] px-2 py-2 text-center max-xl:sticky max-xl:left-0 max-xl:z-20 ${stickyCellBg} max-xl:shadow-[1px_0_0_var(--card-border)]`}>
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
                  <td className="max-xl:hidden w-[4.25rem] px-1 py-1.5 text-center align-middle">
                    <OrderListAdminMemoCell
                      orderId={o.id}
                      initialMemo={o.listAdminMemo}
                    />
                  </td>
                  <td className="max-xl:hidden w-[4.25rem] px-1 py-1.5 text-center align-middle">
                    <OrderListTechMemoCell
                      orderId={o.id}
                      initialMemo={o.listTechMemo}
                      canEdit={canEditTechMemo}
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
                  <td className={`whitespace-nowrap px-2 py-2 text-center font-mono font-semibold max-xl:sticky max-xl:left-[7.5rem] max-xl:z-10 ${stickyCellBg} max-xl:shadow-[1px_0_0_var(--card-border)]`}>
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
                        kaitenTrackLane={o.kaitenTrackLane}
                        kaitenBlocked={blocked}
                        kaitenBlockReason={o.kaitenBlockReason}
                        filterHref={kaitenStatusFilterHref}
                        boardFilterHref={boardFilterHref}
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
                    {formatFinanceDateTime(o.dueDate)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-center align-middle text-[var(--text-secondary)]">
                    {formatFinanceDateTime(
                      o.appointmentDate ?? o.dueToAdminsAt,
                    )}
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
                    <OrderShippedToggle
                      orderId={o.id}
                      shipped={workSent}
                      shippedAtIso={o.adminShippedAt}
                    />
                  </td>
                  <td className="w-[15.5rem] max-w-[15.5rem] px-1.5 py-2 text-left align-top">
                    {renderTagsCell()}
                  </td>
                </tr>
                <tr className="border-b border-[var(--card-border)] shell-desktop:hidden print:hidden">
                  <td colSpan={99} className="p-0">
                    <div
                      className={["cursor-pointer px-2.5 py-2", mobileCardAccent]
                        .filter(Boolean)
                        .join(" ")}
                      role="link"
                      tabIndex={0}
                      aria-label={`Открыть наряд ${o.orderNumber}`}
                      onClick={(e: MouseEvent<HTMLElement>) => {
                        if (targetInsideInteractive(e.target)) return;
                        if (e.button !== 0) return;
                        const href = orderPathById(o.id);
                        if (e.metaKey || e.ctrlKey) {
                          window.open(href, "_blank", "noopener,noreferrer");
                          return;
                        }
                        router.push(href);
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        if (targetInsideInteractive(e.target)) return;
                        e.preventDefault();
                        router.push(orderPathById(o.id));
                      }}
                    >
                      <div className="mb-1 flex min-w-0 items-center gap-1.5">
                        <Link
                          href={orderPathById(o.id)}
                          className="shrink-0 font-mono text-[0.95rem] font-bold leading-none text-[var(--sidebar-blue)] hover:underline"
                          title={`${o.orderNumber} — открыть наряд`}
                        >
                          № {o.orderNumber}
                        </Link>
                        <OrderListKaitenColumnTag
                          kaitenCardId={o.kaitenCardId}
                          demoKanbanColumn={o.demoKanbanColumn}
                          demoCardTypeName={o.kaitenCardType?.name ?? null}
                          kaitenColumnTitle={o.kaitenColumnTitle}
                          kaitenTrackLane={o.kaitenTrackLane}
                          kaitenBlocked={blocked}
                          kaitenBlockReason={o.kaitenBlockReason}
                          filterHref={kaitenStatusFilterHref}
                          boardFilterHref={boardFilterHref}
                          placement="underOrderNumber"
                        />
                        <div
                          className="ms-auto flex shrink-0 items-center gap-1.5"
                          data-row-click-ignore
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)]">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-[var(--input-border)]"
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
                          <div className="[&_button]:h-8 [&_button]:min-h-8 [&_button]:min-w-8 [&_button]:w-8">
                            <OrderShippedToggle
                              orderId={o.id}
                              shipped={workSent}
                              shippedAtIso={o.adminShippedAt}
                            />
                          </div>
                        </div>
                      </div>

                      <div
                        className="mb-1 max-w-full"
                        data-row-click-ignore
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-start gap-2">
                          <OrderListAdminMemoCell
                            orderId={o.id}
                            initialMemo={o.listAdminMemo}
                          />
                          <OrderListTechMemoCell
                            orderId={o.id}
                            initialMemo={o.listTechMemo}
                            canEdit={canEditTechMemo}
                          />
                        </div>
                      </div>

                      <div className="truncate text-xs text-[var(--text-secondary)]">
                        {clinicName}
                      </div>

                      <div className="mb-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0 text-sm font-semibold leading-snug text-[var(--app-text)]">
                        {doctorName ? <span>{doctorName}</span> : null}
                        {doctorName && patientName ? (
                          <span className="font-normal text-[var(--text-muted)]">
                            ·
                          </span>
                        ) : null}
                        {patientName ? <span>{patientName}</span> : null}
                        {labDueLabel || appointmentLabel ? (
                          <span className="ms-auto text-[11px] font-normal text-[var(--text-muted)]">
                            {labDueLabel ? `Лаб ${labDueLabel}` : null}
                            {labDueLabel && appointmentLabel ? " · " : null}
                            {appointmentLabel
                              ? `Зап. ${appointmentLabel}`
                              : null}
                          </span>
                        ) : null}
                      </div>

                      {o.counterpartyRequisitesText?.trim() ? (
                        <div className="mb-1 truncate text-[11px] leading-snug text-[var(--text-muted)]">
                          {o.counterpartyRequisitesText.trim()}
                        </div>
                      ) : null}

                      <div className="flex min-w-0 items-center gap-1.5">
                        <div
                          className="shrink-0 [&_button]:h-8 [&_button]:min-h-8 [&_button]:min-w-8"
                          data-row-click-ignore
                          onClick={(e) => e.stopPropagation()}
                        >
                          <OrderListOrderChatCell
                            orderId={o.id}
                            orderNumber={o.orderNumber}
                            patientName={patientName || undefined}
                            doctorName={doctorName || undefined}
                            labMentionHighlight={
                              canSeeAdminIndicators &&
                              o.listKaitenLabMentionHighlight
                            }
                            embedded
                          />
                        </div>
                        <div
                          className="min-w-0 flex-1 text-xs text-[var(--text-secondary)] [&_.order-list-tags-pack]:items-center"
                          data-row-click-ignore
                          onClick={(e) => e.stopPropagation()}
                        >
                          {renderTagsCell()}
                        </div>
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
