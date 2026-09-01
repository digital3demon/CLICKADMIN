"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, memo, type MouseEvent } from "react";
import { OrderKaitenQrModal } from "@/components/orders/OrderKaitenQrModal";
import { OrderListCardTypeTag } from "@/components/orders/OrderListCardTypeTag";
import { OrderListKaitenColumnTag } from "@/components/orders/OrderListKaitenColumnTag";
import { OrderListOrderChatCell } from "@/components/orders/OrderListOrderChatCell";
import { OrderNarjadPrintTrigger } from "@/components/orders/OrderNarjadPrintTrigger";
import { OrderShippedToggle } from "@/components/orders/OrderShippedToggle";
import { OrderStickerPrintLink } from "@/components/orders/OrderStickerPrintLink";
import { FinanceOfficeInvoiceIssuedCell } from "@/components/finance-office/FinanceOfficeInvoiceIssuedCell";
import { OrderListTagsCell } from "@/components/orders/OrderListTagsCell";
import {
  ORDER_LIST_MOBILE_ACTION_BTN,
  ORDER_LIST_MOBILE_TAG_ADD_BTN,
} from "@/lib/order-list-mobile-ui";
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
import { orderPathById } from "@/lib/order-public-ref";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import type { FinanceOfficeOrderTableRow } from "@/components/finance-office/FinanceOfficeOrdersTable";
import type { OrdersShipmentMode } from "@/lib/orders-shipment-list-query";
import { ListRowUnfold } from "@/components/layout/ListRowUnfold";
import { crmCityAddressTextClass } from "@/lib/crm-lab-city";

function financeOfficeClinicNameClass(address: string | null | undefined): string {
  const city = crmCityAddressTextClass(address);
  return city.includes("amber")
    ? city
    : "text-[var(--sidebar-blue)]";
}

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

function formatFinanceCardDateTime(iso: string | null): {
  date: string;
  time: string;
} | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
    }),
    time: d.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
}

function FinanceMobileReadonlyDate({
  label,
  iso,
  tone,
}: {
  label: string;
  iso: string | null;
  tone: "lab" | "appointment";
}) {
  const parts = formatFinanceCardDateTime(iso);
  const borderClass =
    tone === "lab"
      ? "border-teal-500/45 text-teal-800 dark:text-teal-200"
      : "border-amber-500/45 text-amber-800 dark:text-amber-200";
  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="w-6 shrink-0 text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
      <div
        className={`min-w-[3.1rem] rounded-md border px-1 py-0.5 text-center leading-tight ${borderClass}`}
      >
        <div className="text-[10px] font-semibold tabular-nums">
          {parts?.date ?? "—"}
        </div>
        {parts?.time ? (
          <div className="text-[9px] tabular-nums opacity-85">{parts.time}</div>
        ) : null}
      </div>
    </div>
  );
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

type RowChrome = {
  o: FinanceOfficeOrderTableRow;
  tab: string;
  periodFrom: string | null;
  periodTo: string | null;
  q: string | null;
  shipMode: OrdersShipmentMode | null;
  shipFrom: string | null;
  shipTo: string | null;
  invFrom: string | null;
  invTo: string | null;
  canSeeAdminIndicators: boolean;
};

function deriveRowChrome(args: RowChrome) {
  const { o, tab, periodFrom, periodTo, q, shipMode, shipFrom, shipTo, invFrom, invTo, canSeeAdminIndicators } = args;
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
  const rowAccent = resolveOrderListRowAccentKind({
    listPendingChatCorrections: o.listPendingChatCorrections,
    listCompositionMismatch: o.listCompositionMismatch,
    listPendingProstheticsRequests: o.listPendingProstheticsRequests,
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
  return {
    o,
    workSent,
    clinicName,
    doctorName,
    patientName,
    labDueLabel,
    appointmentLabel,
    rowClass,
    mobileCardAccent,
    canSeeAdminIndicators,
    tab,
    periodFrom,
    periodTo,
    q,
    shipMode,
    shipFrom,
    shipTo,
    invFrom,
    invTo,
  };
}

const TagsCell = memo(function TagsCell({
  o,
  tab,
  periodFrom,
  periodTo,
  q,
  shipMode,
  shipFrom,
  shipTo,
  invFrom,
  invTo,
  addButtonClassName,
}: {
  o: FinanceOfficeOrderTableRow;
  tab: string;
  periodFrom: string | null;
  periodTo: string | null;
  q: string | null;
  shipMode: OrdersShipmentMode | null;
  shipFrom: string | null;
  shipTo: string | null;
  invFrom: string | null;
  invTo: string | null;
  addButtonClassName?: string;
}) {
  return (
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
      hasUpdAttachment={o.updAttachmentId != null}
      updNumber={o.updNumber}
      updPrinted={o.updPrinted}
      updAttachmentId={o.updAttachmentId}
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
      financeOfficeFilterContext={{
        tab,
        periodFrom,
        periodTo,
        q,
        ship: shipMode,
        shipFrom,
        shipTo,
        invFrom,
        invTo,
      }}
      financeCalculated={o.financeCalculated}
      clinicWorksWithEdo={o.clinicWorksWithEdo}
      clinicUsesPaperDocs={o.clinicUsesPaperDocs}
      omitKaitenColumnTag
      addButtonClassName={addButtonClassName}
    />
  );
});

const DesktopRestCells = memo(function DesktopRestCells(args: RowChrome) {
  const d = deriveRowChrome(args);
  const { o } = d;
  return (
    <>
      <OrderListOrderChatCell
        orderId={o.id}
        orderNumber={o.orderNumber}
        patientName={d.patientName || undefined}
        doctorName={d.doctorName || undefined}
        labMentionHighlight={
          d.canSeeAdminIndicators && o.listKaitenLabMentionHighlight
        }
      />
      <td
        className="w-[5.5rem] whitespace-nowrap px-1 py-2 text-center font-mono font-semibold"
      >
        <div className="flex items-center justify-center">
          <Link
            prefetch={false}
            href={orderPathById(o.id)}
            className="whitespace-nowrap font-mono text-[11px] font-semibold leading-none text-[var(--sidebar-blue)] hover:underline sm:text-xs"
            title={`${o.orderNumber} — открыть наряд`}
          >
            {o.orderNumber}
          </Link>
        </div>
      </td>
      <td className="min-w-0 w-[11%] px-1 py-2 text-center align-middle">
        {o.clinic ? (
          <Link
            prefetch={false}
            href={`/clients/${o.clinic.id}`}
            title={o.clinic.address?.trim() || undefined}
            className={`block hyphens-auto break-words text-center hover:underline ${financeOfficeClinicNameClass(o.clinic.address)}`}
          >
            {o.clinic.name}
          </Link>
        ) : (
          <span className="block break-words text-center text-[var(--text-secondary)]">
            Частное лицо
          </span>
        )}
      </td>
      <td className="min-w-0 w-[7.25rem] px-1 py-2 text-center align-middle">
        <Link
          prefetch={false}
          href={`/clients/doctors/${o.doctor.id}`}
          className="block break-words text-center text-[var(--sidebar-blue)] hover:underline"
        >
          {personNameSurnameInitials(o.doctor.fullName)}
        </Link>
      </td>
      <td className="min-w-0 w-[6.25rem] px-1 py-2 text-center align-middle">
        <span className="block hyphens-auto break-words text-center">
          {o.patientName ? personNameSurnameInitials(o.patientName) : "—"}
        </span>
      </td>
      <td className="min-w-0 w-[6.5rem] px-1 py-2 text-center align-middle">
        <FinanceOfficeInvoiceIssuedCell
          orderId={o.id}
          issuedAtIso={o.invoiceIssuedAt}
        />
      </td>
      <td className="min-w-0 w-[4.5rem] break-words px-1 py-2 text-center align-middle text-[var(--text-secondary)]">
        {formatFinanceCardDate(o.dueDate) ?? "—"}
      </td>
      <td className="min-w-0 w-[4.5rem] break-words px-1 py-2 text-center align-middle text-[var(--text-secondary)]">
        {formatFinanceCardDate(o.appointmentDate ?? o.dueToAdminsAt) ?? "—"}
      </td>
      <td className="hidden min-w-0 w-[8.5rem] whitespace-pre-line break-words px-1 py-2 text-center text-[11px] leading-snug text-[var(--text-secondary)] shell-desktop:table-cell">
        {o.counterpartyRequisitesText || "—"}
      </td>
      <td className="hidden min-w-0 w-[4rem] break-words px-1 py-2 text-center text-[11px] leading-snug text-[var(--text-secondary)] shell-desktop:table-cell">
        {o.legalEntity || "—"}
      </td>
      <td
        data-shipped-cell
        className="min-w-0 w-[4.25rem] px-1 py-2 text-center align-middle"
      >
        <OrderShippedToggle
          orderId={o.id}
          shipped={d.workSent}
          shippedAtIso={o.adminShippedAt}
          readOnly
        />
      </td>
      <td className="min-w-0 px-2 py-2 text-left align-top">
        <TagsCell
          o={o}
          tab={d.tab}
          periodFrom={d.periodFrom}
          periodTo={d.periodTo}
          q={d.q}
          shipMode={d.shipMode}
          shipFrom={d.shipFrom}
          shipTo={d.shipTo}
          invFrom={d.invFrom}
          invTo={d.invTo}
        />
      </td>
      <td className="w-[4.5rem] px-1 py-2 align-top shell-desktop:hidden">
        <ListRowUnfold>
          <p>
            <span className="font-semibold text-[var(--text-body)]">Реквизиты: </span>
            {o.counterpartyRequisitesText?.trim() || "—"}
          </p>
          <p>
            <span className="font-semibold text-[var(--text-body)]">Юрлицо: </span>
            {o.legalEntity?.trim() || "—"}
          </p>
        </ListRowUnfold>
      </td>
    </>
  );
});

export const FinanceOfficeOrderRow = memo(function FinanceOfficeOrderRow({
  o,
  isSelected,
  onToggle,
  tab,
  periodFrom,
  periodTo,
  q,
  shipMode,
  shipFrom,
  shipTo,
  invFrom,
  invTo,
  canSeeAdminIndicators,
}: RowChrome & {
  isSelected: boolean;
  onToggle: (id: string, checked: boolean) => void;
}) {
  const router = useRouter();
  const chrome: RowChrome = {
    o,
    tab,
    periodFrom,
    periodTo,
    q,
    shipMode,
    shipFrom,
    shipTo,
    invFrom,
    invTo,
    canSeeAdminIndicators,
  };
  const d = deriveRowChrome(chrome);
  const { workSent, clinicName, doctorName, patientName } = d;
  const clinicAddress = o.clinic?.address?.trim() || undefined;
  const cardTypeName = o.kaitenCardType?.name ?? null;

  return (
    <Fragment>
      <tr className={`hidden shell-laptop:table-row ${d.rowClass}`}>
        <td
          className="w-[7.5rem] px-1 py-2 text-center"
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[var(--input-border)]"
            checked={isSelected}
            onChange={(e) => onToggle(o.id, e.target.checked)}
            aria-label={`Выбрать наряд ${o.orderNumber}`}
          />
        </td>
        <DesktopRestCells {...chrome} />
      </tr>
      <tr className="border-b border-[var(--card-border)] shell-laptop:hidden print:hidden">
        <td colSpan={99} className="p-0">
          <div
            className={["cursor-pointer p-3", d.mobileCardAccent]
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
            <div className="mb-2 flex min-w-0 items-center gap-2">
              <Link
                prefetch={false}
                href={orderPathById(o.id)}
                className="shrink-0 font-mono text-base font-bold leading-none text-[var(--sidebar-blue)] hover:underline"
                title={`${o.orderNumber} — открыть наряд`}
              >
                № {o.orderNumber}
              </Link>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-hidden">
                <OrderListKaitenColumnTag
                  kaitenCardId={o.kaitenCardId}
                  demoKanbanColumn={o.demoKanbanColumn}
                  demoCardTypeName={cardTypeName}
                  kaitenColumnTitle={o.kaitenColumnTitle}
                  kaitenTrackLane={o.kaitenTrackLane}
                  kaitenBlocked={o.kaitenBlocked === true}
                  kaitenBlockReason={o.kaitenBlockReason}
                  placement="underOrderNumber"
                  boardLayout="inline"
                  includeCardType={false}
                />
                <OrderListCardTypeTag
                  name={cardTypeName}
                  placement="underOrderNumber"
                />
              </div>
            </div>

            <div className="mb-2.5 space-y-0.5">
              <div className="truncate text-sm font-semibold text-[var(--app-text)]">
                {[patientName, doctorName].filter(Boolean).join(" · ")}
              </div>
              {clinicName ? (
                <div className="truncate text-xs font-normal text-[var(--text-muted)]">
                  {clinicName}
                </div>
              ) : null}
              {clinicAddress ? (
                <div
                  className={`truncate text-xs ${crmCityAddressTextClass(clinicAddress)}`}
                  title={clinicAddress}
                >
                  {clinicAddress}
                </div>
              ) : null}
            </div>

            <div className="flex min-w-0 items-center gap-1.5">
              <div
                className="flex shrink-0 items-center gap-1"
                data-row-click-ignore
                onClick={(e) => e.stopPropagation()}
              >
                <label
                  className={`${ORDER_LIST_MOBILE_ACTION_BTN} cursor-pointer`}
                  title={`Выбрать наряд ${o.orderNumber}`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--input-border)]"
                    checked={isSelected}
                    onChange={(e) => onToggle(o.id, e.target.checked)}
                    aria-label={`Выбрать наряд ${o.orderNumber}`}
                  />
                </label>
                <OrderListOrderChatCell
                  orderId={o.id}
                  orderNumber={o.orderNumber}
                  patientName={patientName || undefined}
                  doctorName={doctorName || undefined}
                  labMentionHighlight={
                    canSeeAdminIndicators && o.listKaitenLabMentionHighlight
                  }
                  embedded
                  buttonClassName={`${ORDER_LIST_MOBILE_ACTION_BTN}${
                    canSeeAdminIndicators && o.listKaitenLabMentionHighlight
                      ? " animate-pulse text-amber-500 dark:text-amber-400"
                      : ""
                  }`}
                />
                {!workSent ? (
                  <OrderNarjadPrintTrigger
                    orderId={o.id}
                    variant="icon"
                    className={ORDER_LIST_MOBILE_ACTION_BTN}
                    title="Печать наряда (PDF) — диалог печати"
                  />
                ) : null}
                <OrderStickerPrintLink
                  orderId={o.id}
                  className={ORDER_LIST_MOBILE_ACTION_BTN}
                />
                <OrderKaitenQrModal
                  orderId={o.id}
                  compact
                  buttonClassName={ORDER_LIST_MOBILE_ACTION_BTN}
                />
              </div>
              <div
                className="flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-x-auto"
                data-row-click-ignore
                onClick={(e) => e.stopPropagation()}
              >
                <FinanceMobileReadonlyDate
                  label="Лаб"
                  iso={o.dueDate}
                  tone="lab"
                />
                <FinanceMobileReadonlyDate
                  label="Зап"
                  iso={o.appointmentDate ?? o.dueToAdminsAt}
                  tone="appointment"
                />
                <div className="flex min-w-0 items-center gap-1">
                  <span className="w-6 shrink-0 text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Сч
                  </span>
                  <div className="min-w-[3.75rem]">
                    <FinanceOfficeInvoiceIssuedCell
                      orderId={o.id}
                      issuedAtIso={o.invoiceIssuedAt}
                    />
                  </div>
                </div>
              </div>
              <div
                className="shrink-0"
                data-row-click-ignore
                onClick={(e) => e.stopPropagation()}
              >
                <OrderShippedToggle
                  orderId={o.id}
                  shipped={workSent}
                  shippedAtIso={o.adminShippedAt}
                  readOnly
                  layout="mobile"
                />
              </div>
            </div>

            <div
              className="mt-2.5 text-xs text-[var(--text-secondary)]"
              data-row-click-ignore
              onClick={(e) => e.stopPropagation()}
            >
              <TagsCell
                o={o}
                tab={tab}
                periodFrom={periodFrom}
                periodTo={periodTo}
                q={q}
                shipMode={shipMode}
                shipFrom={shipFrom}
                shipTo={shipTo}
                invFrom={invFrom}
                invTo={invTo}
                addButtonClassName={ORDER_LIST_MOBILE_TAG_ADD_BTN}
              />
            </div>

            {o.counterpartyRequisitesText?.trim() ? (
              <div className="mt-2 break-words text-[11px] leading-snug text-[var(--text-muted)]">
                {o.counterpartyRequisitesText.trim()}
              </div>
            ) : null}
          </div>
        </td>
      </tr>
    </Fragment>
  );
});
