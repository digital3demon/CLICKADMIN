"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, memo, type MouseEvent } from "react";
import { OrderListKaitenColumnTag } from "@/components/orders/OrderListKaitenColumnTag";
import { OrderListOrderChatCell } from "@/components/orders/OrderListOrderChatCell";
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
import { orderPathById } from "@/lib/order-public-ref";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import type { FinanceOfficeOrderTableRow } from "@/components/finance-office/FinanceOfficeOrdersTable";
import { ListRowUnfold } from "@/components/layout/ListRowUnfold";

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

type RowChrome = {
  o: FinanceOfficeOrderTableRow;
  tab: string;
  periodFrom: string | null;
  periodTo: string | null;
  q: string | null;
  canSeeAdminIndicators: boolean;
};

function deriveRowChrome(args: RowChrome) {
  const { o, tab, periodFrom, periodTo, q, canSeeAdminIndicators } = args;
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
  const stickyCellBg = rowAccent
    ? "max-xl:bg-[var(--card-bg)]"
    : financeTint
      ? ""
      : "max-xl:bg-[var(--card-bg)]";
  return {
    o,
    workSent,
    clinicName,
    doctorName,
    patientName,
    labDueLabel,
    appointmentLabel,
    blocked,
    kaitenStatusFilterHref,
    boardFilterHref,
    rowClass,
    mobileCardAccent,
    stickyCellBg,
    canSeeAdminIndicators,
    tab,
    periodFrom,
    periodTo,
    q,
  };
}

const TagsCell = memo(function TagsCell({
  o,
  tab,
  periodFrom,
  periodTo,
  q,
}: {
  o: FinanceOfficeOrderTableRow;
  tab: string;
  periodFrom: string | null;
  periodTo: string | null;
  q: string | null;
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
      clinicUsesPaperDocs={o.clinicUsesPaperDocs}
      omitKaitenColumnTag
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
        className={`whitespace-nowrap px-2 py-2 text-center font-mono font-semibold max-xl:sticky max-xl:left-[7.5rem] max-xl:z-10 ${d.stickyCellBg} max-xl:shadow-[1px_0_0_var(--card-border)]`}
      >
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
            kaitenBlocked={d.blocked}
            kaitenBlockReason={o.kaitenBlockReason}
            filterHref={d.kaitenStatusFilterHref}
            boardFilterHref={d.boardFilterHref}
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
          {o.patientName ? personNameSurnameInitials(o.patientName) : "—"}
        </span>
      </td>
      <td className="whitespace-nowrap px-2 py-2 text-center align-middle text-[var(--text-secondary)]">
        {formatFinanceDateTime(o.dueDate)}
      </td>
      <td className="whitespace-nowrap px-2 py-2 text-center align-middle text-[var(--text-secondary)]">
        {formatFinanceDateTime(o.appointmentDate ?? o.dueToAdminsAt)}
      </td>
      <td className="hidden w-[11rem] max-w-[11rem] whitespace-pre-line break-words px-1.5 py-2 text-center text-[11px] leading-snug text-[var(--text-secondary)] shell-desktop:table-cell">
        {o.counterpartyRequisitesText || "—"}
      </td>
      <td className="hidden w-[7rem] max-w-[7rem] break-words px-1.5 py-2 text-center text-[11px] leading-snug text-[var(--text-secondary)] shell-desktop:table-cell">
        {o.legalEntity || "—"}
      </td>
      <td
        data-shipped-cell
        className="w-[4.5rem] px-1 py-2 text-center align-middle"
      >
        <OrderShippedToggle
          orderId={o.id}
          shipped={d.workSent}
          shippedAtIso={o.adminShippedAt}
        />
      </td>
      <td className="w-[15.5rem] max-w-[15.5rem] px-1.5 py-2 text-left align-top">
        <TagsCell
          o={o}
          tab={d.tab}
          periodFrom={d.periodFrom}
          periodTo={d.periodTo}
          q={d.q}
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
    canSeeAdminIndicators,
  };
  const d = deriveRowChrome(chrome);
  const { workSent, clinicName, doctorName, patientName, labDueLabel, appointmentLabel } =
    d;

  return (
    <Fragment>
      <tr className={`hidden shell-laptop:table-row ${d.rowClass}`}>
        <td
          className={`w-[7.5rem] px-2 py-2 text-center max-xl:sticky max-xl:left-0 max-xl:z-20 ${d.stickyCellBg} max-xl:shadow-[1px_0_0_var(--card-border)]`}
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
            className={["cursor-pointer px-2.5 py-2", d.mobileCardAccent]
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
                kaitenBlocked={d.blocked}
                kaitenBlockReason={o.kaitenBlockReason}
                filterHref={d.kaitenStatusFilterHref}
                boardFilterHref={d.boardFilterHref}
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
                    checked={isSelected}
                    onChange={(e) => onToggle(o.id, e.target.checked)}
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

            <div className="break-words text-xs text-[var(--text-secondary)]">
              {clinicName}
            </div>

            <div className="mb-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0 text-sm font-semibold leading-snug text-[var(--app-text)]">
              {doctorName ? <span>{doctorName}</span> : null}
              {doctorName && patientName ? (
                <span className="font-normal text-[var(--text-muted)]">·</span>
              ) : null}
              {patientName ? <span>{patientName}</span> : null}
              {labDueLabel || appointmentLabel ? (
                <span className="ms-auto text-[11px] font-normal text-[var(--text-muted)]">
                  {labDueLabel ? `Лаб ${labDueLabel}` : null}
                  {labDueLabel && appointmentLabel ? " · " : null}
                  {appointmentLabel ? `Зап. ${appointmentLabel}` : null}
                </span>
              ) : null}
            </div>

            {o.counterpartyRequisitesText?.trim() ? (
              <div className="mb-1 break-words text-[11px] leading-snug text-[var(--text-muted)]">
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
                    canSeeAdminIndicators && o.listKaitenLabMentionHighlight
                  }
                  embedded
                />
              </div>
              <div
                className="min-w-0 flex-1 text-xs text-[var(--text-secondary)] [&_.order-list-tags-pack]:items-center"
                data-row-click-ignore
                onClick={(e) => e.stopPropagation()}
              >
                <TagsCell
                  o={o}
                  tab={tab}
                  periodFrom={periodFrom}
                  periodTo={periodTo}
                  q={q}
                />
              </div>
            </div>
          </div>
        </td>
      </tr>
    </Fragment>
  );
});
