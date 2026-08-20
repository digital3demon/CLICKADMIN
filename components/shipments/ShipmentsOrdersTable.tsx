import Link from "next/link";
import { Fragment } from "react";
import { OrderKaitenQrModal } from "@/components/orders/OrderKaitenQrModal";
import { OrderListDueCell } from "@/components/orders/OrderListDueCell";
import { OrderListOrderChatCell } from "@/components/orders/OrderListOrderChatCell";
import { OrderListKaitenPoller } from "@/components/orders/OrderListKaitenPoller";
import { OrderShippedToggle } from "@/components/orders/OrderShippedToggle";
import { OrderListTagsCell } from "@/components/orders/OrderListTagsCell";
import { OrderNarjadPrintTrigger } from "@/components/orders/OrderNarjadPrintTrigger";
import { OrderStickerPrintLink } from "@/components/orders/OrderStickerPrintLink";
import { ShipmentsPrintButton } from "@/components/shipments/ShipmentsPrintButton";
import { ShipmentsListChrome } from "@/components/shipments/ShipmentsListChrome";
import { ShipmentsTableMirrorScroll } from "@/components/shipments/ShipmentsTableMirrorScroll";
import type { ShipmentOrderRow } from "@/lib/fetch-shipments-orders";
import { getKaitenCardWebUrl } from "@/lib/kaiten-card-web-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { clampOrdersPageSize } from "@/lib/orders-list-cursor";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { orderPathById } from "@/lib/order-public-ref";
import { OrderListKaitenColumnTag } from "@/components/orders/OrderListKaitenColumnTag";
import {
  listTagKaitenColumnTitle,
  listTagKaitenTrackLaneOrNull,
  LIST_TAG_KAITEN_BLOCKED,
} from "@/lib/order-list-tag-filter";
import { ORDER_SHIPPED_ROW_CLASS } from "@/lib/order-shipped-row-class";
import {
  mergeOrderListRowClass,
  orderListMobileCardAccentClass,
  resolveOrderListRowAccentKind,
} from "@/lib/order-list-row-accent";
import { shipmentsListHref } from "@/lib/shipments-list-query";

const TAGS_PAGE_SIZE = clampOrdersPageSize(null);

const SHIPMENTS_TABLE_TH =
  "min-w-0 whitespace-nowrap px-1 py-1 text-center sm:px-1.5 sm:py-1.5";

const SHIPMENTS_TABLE_CLASS =
  "w-full min-w-[56rem] table-fixed border-collapse text-left text-[10px] sm:text-[11px] md:min-w-[56rem] lg:min-w-0 lg:text-xs 2xl:text-[13px]";

function ShipmentsTableHeaderRow({
  showAccountantColumns,
}: {
  showAccountantColumns: boolean;
}) {
  return (
    <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-[9px] font-semibold uppercase leading-snug tracking-wide text-[var(--text-secondary)] sm:text-[10px] md:text-xs print:bg-[var(--card-bg)]">
      <th
        className={`${SHIPMENTS_TABLE_TH} max-md:hidden normal-case print:hidden`}
        title="Чат карточки в Kaiten"
      >
        Чат
      </th>
      <th
        className={`${SHIPMENTS_TABLE_TH} max-md:hidden normal-case print:hidden`}
        aria-label="Печать наряда, этикетки и QR"
        title="Печать наряда, этикетки и QR на карточку Kaiten"
      >
        Печать
      </th>
      <th className={SHIPMENTS_TABLE_TH} title="№ наряда">
        № наряда
      </th>
      <th className={SHIPMENTS_TABLE_TH} title="Клиника">
        Клиника
      </th>
      <th className={SHIPMENTS_TABLE_TH} title="Адрес клиники">
        Адрес
      </th>
      <th className={SHIPMENTS_TABLE_TH} title="Врач">
        Врач
      </th>
      <th className={SHIPMENTS_TABLE_TH} title="Пациент">
        Пациент
      </th>
      <th
        className={SHIPMENTS_TABLE_TH}
        title="Поступление: когда работа зашла в лабораторию (без даты — дата занесения наряда)"
      >
        Поступление
      </th>
      <th className={SHIPMENTS_TABLE_TH} title="Срок лабораторный">
        ЛАБ
      </th>
      <th
        className={SHIPMENTS_TABLE_TH}
        title="Запись: дата и время приёма пациента"
      >
        Запись
      </th>
      {showAccountantColumns ? (
        <>
          <th
            className={`${SHIPMENTS_TABLE_TH} align-top normal-case`}
            title="ИНН, КПП, банк, р/с и др. по карточке клиники или ИП врача"
          >
            Реквизиты
          </th>
          <th
            className={`${SHIPMENTS_TABLE_TH} align-top normal-case`}
            title="С какого юрлица лаборатории ведётся наряд (поле в наряде)"
          >
            Наше юрлицо
          </th>
        </>
      ) : null}
      <th
        className={`${SHIPMENTS_TABLE_TH} normal-case print:hidden`}
        title="Отправка работы"
      >
        Отправка
      </th>
      <th
        className={`${SHIPMENTS_TABLE_TH} align-top normal-case`}
        title="Отметки: как на странице «Заказы»"
      >
        Отметки
      </th>
    </tr>
  );
}

function ShipmentsTableColGroup({
  showAccountantColumns,
}: {
  showAccountantColumns: boolean;
}) {
  if (showAccountantColumns) {
    return (
      <colgroup>
        <col className="max-md:hidden lg:w-[3%]" />
        <col className="max-md:hidden lg:w-[5.5%]" />
        <col className="lg:w-[7.2%]" />
        <col className="lg:w-[10%]" />
        <col className="lg:w-[10%]" />
        <col className="lg:w-[7.5%]" />
        <col className="lg:w-[7%]" />
        <col className="lg:w-[6.5%]" />
        <col className="lg:w-[6.5%]" />
        <col className="lg:w-[6.5%]" />
        <col className="lg:w-[10%]" />
        <col className="lg:w-[8%]" />
        <col className="lg:w-[4.5%]" />
        <col className="lg:w-[12%]" />
      </colgroup>
    );
  }
  return (
    <colgroup>
      <col className="max-md:hidden lg:w-[3%]" />
      <col className="max-md:hidden lg:w-[6.6%]" />
        <col className="lg:w-[7.2%]" />
      <col className="lg:w-[12.1%]" />
      <col className="lg:w-[11.9%]" />
      <col className="lg:w-[8.6%]" />
      <col className="lg:w-[8.2%]" />
      <col className="lg:w-[7.6%]" />
      <col className="lg:w-[7.8%]" />
      <col className="lg:w-[7.8%]" />
      <col className="lg:w-[5.2%]" />
      <col className="lg:w-[20%]" />
    </colgroup>
  );
}

function formatAdmission(o: {
  workReceivedAt: Date | null;
  createdAt: Date;
}): string {
  const d = o.workReceivedAt ?? o.createdAt;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatShipmentCardDate(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function ShipmentsOrdersTable({
  orders,
  emptyHint,
  listHeading,
  listHeadingScreen = true,
  isDemo = false,
  siteOrigin = null,
  labDueHmSlots,
  showAccountantColumns = false,
  shipmentsTagFilterContext = null,
  stickersPrintHref = null,
}: {
  orders: ShipmentOrderRow[];
  emptyHint: string;
  /** Подзаголовок: при печати всегда из `listHeading`; на экране — если `listHeadingScreen`. */
  listHeading?: string;
  /** Показывать `listHeading` в панели над таблицей (если текст перенесён в форму периода — false). */
  listHeadingScreen?: boolean;
  isDemo?: boolean;
  siteOrigin?: string | null;
  labDueHmSlots: readonly string[];
  /** Доп. колонки «Реквизиты» и «Наше юрлицо» (роль бухгалтер). */
  showAccountantColumns?: boolean;
  /** Контекст для ссылок фильтра по пилюлям «Отметки» — остаёмся на странице отгрузок. */
  shipmentsTagFilterContext?: {
    tab: string;
    periodFrom: string | null;
    periodTo: string | null;
  } | null;
  /** Ссылка на печать этикеток 58×40 мм (тот же query, что у списка отгрузок). */
  stickersPrintHref?: string | null;
}) {
  if (orders.length === 0) {
    return (
      <p className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
        {emptyHint}
      </p>
    );
  }

  const mirrorScrollId = "shipments-table-mirror-scroll";
  const bodyScrollId = "shipments-table-body-scroll";

  return (
    <div className="w-full min-w-0">
      {!isDemo ? (
        <OrderListKaitenPoller
          orderIds={orders
            .filter((o) => o.kaitenCardId != null)
            .map((o) => o.id)}
        />
      ) : null}
      <ShipmentsTableMirrorScroll
        mirrorId={mirrorScrollId}
        bodyId={bodyScrollId}
      />
      <ShipmentsListChrome
        className="shipments-print-area w-full max-w-full min-w-0 overflow-y-visible rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm print:max-w-none print:w-full print:overflow-visible print:border-zinc-400 print:shadow-none"
        toolbarClassName="rounded-t-lg bg-[var(--card-bg)] pb-0 print:static"
        toolbar={
          <>
        {listHeading && !listHeadingScreen ? (
          <p className="hidden border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 pb-2 pt-2 text-sm font-semibold text-[var(--text-body)] print:block print:mb-0 print:border-b-0 print:bg-transparent print:px-0 print:pt-0 print:text-base">
            {listHeading}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 py-2 sm:flex-row sm:items-center md:grid md:grid-cols-[minmax(10rem,1fr)_minmax(0,1fr)] md:items-center md:gap-x-2">
          <div className="flex shrink-0 flex-wrap items-center justify-start gap-2">
            <ShipmentsPrintButton />
            {stickersPrintHref ? (
              <Link
                href={stickersPrintHref}
                className="no-print rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--text-strong)] shadow-sm transition-colors hover:bg-[var(--table-row-hover)]"
              >
                Печать стикеров
              </Link>
            ) : null}
          </div>
          {listHeading && listHeadingScreen ? (
            <p className="min-w-0 text-sm font-medium text-[var(--text-body)] print:mb-2 print:text-base print:font-semibold">
              {listHeading}
            </p>
          ) : null}
        </div>
        <div
          id={mirrorScrollId}
          className="orders-list-mirror-thead hidden w-full min-w-0 overflow-x-auto overflow-y-hidden border-t border-[var(--card-border)] bg-[var(--surface-subtle)] shadow-[0_1px_0_var(--card-border)] [-webkit-overflow-scrolling:touch] shell-desktop:block print:hidden"
        >
          <table className={SHIPMENTS_TABLE_CLASS} aria-hidden="true">
            <ShipmentsTableColGroup showAccountantColumns={showAccountantColumns} />
            <thead>
              <ShipmentsTableHeaderRow
                showAccountantColumns={showAccountantColumns}
              />
            </thead>
          </table>
        </div>
          </>
        }
      >
        <div
          id={bodyScrollId}
          className="orders-harmony-table-shell scrollbar-none w-full min-w-0 overflow-x-auto overflow-y-visible xl:overflow-x-visible [-webkit-overflow-scrolling:touch] print:max-w-none print:w-full print:overflow-visible"
        >
        <table className={SHIPMENTS_TABLE_CLASS}>
          <ShipmentsTableColGroup showAccountantColumns={showAccountantColumns} />
          <thead className="shipments-table-thead-a11y sr-only print:static print:table-header-group">
            <ShipmentsTableHeaderRow
              showAccountantColumns={showAccountantColumns}
            />
          </thead>
          <tbody>
            {orders.map((o) => {
              const kanbanWebUrl =
                siteOrigin != null
                  ? `${siteOrigin.replace(/\/$/, "")}${kanbanOrderDeepLinkPath(o.id)}`
                  : null;
              const kaitenWebUrl =
                !isDemo && o.kaitenCardId != null
                  ? getKaitenCardWebUrl(o.kaitenCardId)
                  : null;
              const workSent = o.adminShippedOtpr;
              const clinicName = o.clinic?.name ?? "Частное лицо";
              const address = o.clinic?.address?.trim() || "";
              const doctorName = personNameSurnameInitials(o.doctor.fullName);
              const patientName = o.patientName
                ? personNameSurnameInitials(o.patientName)
                : "";
              const labDate = formatShipmentCardDate(o.dueDate);
              const appointmentDate = formatShipmentCardDate(
                o.appointmentDate ?? o.dueToAdminsAt,
              );
              const rowAccent = resolveOrderListRowAccentKind({
                listPendingChatCorrections: o.listPendingChatCorrections,
                listCompositionMismatch: o.listCompositionMismatch,
                listPendingProstheticsRequests:
                  o.listPendingProstheticsRequests,
                prostheticsOrdered: o.prostheticsOrdered,
              });
              const rowClass = mergeOrderListRowClass({
                shipped: workSent,
                accent: rowAccent,
                shippedClass: `${ORDER_SHIPPED_ROW_CLASS} print:border-zinc-400 print:bg-transparent`,
              });
              const mobileCardAccent = orderListMobileCardAccentClass(rowAccent);
              const kaitenColTrimmed = o.kaitenColumnTitle?.trim() ?? "";
              const blocked = o.kaitenBlocked === true;
              const kaitenStatusFilterHref = blocked
                ? shipmentsListHref({
                    tab: shipmentsTagFilterContext?.tab ?? "today",
                    tag: LIST_TAG_KAITEN_BLOCKED,
                    from: shipmentsTagFilterContext?.periodFrom ?? undefined,
                    to: shipmentsTagFilterContext?.periodTo ?? undefined,
                  })
                : kaitenColTrimmed
                  ? shipmentsListHref({
                      tab: shipmentsTagFilterContext?.tab ?? "today",
                      tag: listTagKaitenColumnTitle(kaitenColTrimmed),
                      from: shipmentsTagFilterContext?.periodFrom ?? undefined,
                      to: shipmentsTagFilterContext?.periodTo ?? undefined,
                    })
                    : null;
              const laneTag = listTagKaitenTrackLaneOrNull(o.kaitenTrackLane);
              const boardFilterHref = laneTag
                ? shipmentsListHref({
                    tab: shipmentsTagFilterContext?.tab ?? "today",
                    tag: laneTag,
                    from: shipmentsTagFilterContext?.periodFrom ?? undefined,
                    to: shipmentsTagFilterContext?.periodTo ?? undefined,
                  })
                : null;
              const renderPrintActions = () => (
                <>
                  <OrderNarjadPrintTrigger
                    orderId={o.id}
                    variant="icon"
                    title="Печать наряда (PDF) — диалог печати"
                  />
                  <OrderStickerPrintLink orderId={o.id} />
                  <OrderKaitenQrModal
                    orderId={o.id}
                    kaitenUrl={kaitenWebUrl}
                    kanbanUrl={kanbanWebUrl}
                    compact
                  />
                </>
              );
              const renderTagsCell = (opts?: { omitKaitenColumnTag?: boolean }) => (
                <OrderListTagsCell
                  orderId={o.id}
                  pageSize={TAGS_PAGE_SIZE}
                  orderAttentionWarning={
                    o.listCompositionMismatch ||
                    o.listPendingChatCorrections
                  }
                  listPendingChatCorrections={o.listPendingChatCorrections}
                  listCompositionMismatch={o.listCompositionMismatch}
                  kaitenCardId={o.kaitenCardId}
                  demoKanbanColumn={o.demoKanbanColumn}
                  demoCardTypeName={o.kaitenCardType?.name ?? null}
                  kaitenColumnTitle={o.kaitenColumnTitle}
                  kaitenTrackLane={o.kaitenTrackLane}
                  prostheticsOrdered={o.prostheticsOrdered}
                  listPendingProstheticsRequests={
                    o.listPendingProstheticsRequests
                  }
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
                  shipmentsFilterContext={shipmentsTagFilterContext}
                  omitKaitenColumnTag={opts?.omitKaitenColumnTag}
                />
              );
              return (
                <Fragment key={o.id}>
                <tr
                  className={`hidden shell-desktop:table-row print:table-row ${rowClass}`}
                >
                  <OrderListOrderChatCell
                    orderId={o.id}
                    orderNumber={o.orderNumber}
                    patientName={patientName || undefined}
                    doctorName={doctorName || undefined}
                    labMentionHighlight={o.listKaitenLabMentionHighlight}
                  />
                  <td className="max-md:hidden min-w-0 px-0.5 py-1 align-middle sm:py-1.5 print:hidden">
                    <div className="flex min-w-0 flex-nowrap items-center justify-center gap-0">
                      {renderPrintActions()}
                    </div>
                  </td>
                  <td className="min-w-0 px-1 py-1 align-middle sm:px-1.5 sm:py-1.5 print:px-1.5">
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
                  <td className="min-w-0 px-1 py-1 align-middle text-center text-[var(--text-strong)] sm:px-1.5 sm:py-1.5 print:px-1.5">
                    {o.clinic ? (
                      <Link
                        href={`/clients/${o.clinic.id}`}
                        title={o.clinic.name}
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
                  <td className="min-w-0 px-1 py-1 align-middle text-center text-[var(--text-body)] sm:px-1.5 sm:py-1.5 print:px-1.5">
                    {o.clinic?.address?.trim() ? (
                      <span
                        className="block hyphens-auto break-words text-center text-[var(--text-secondary)]"
                        title={o.clinic.address.trim()}
                      >
                        {o.clinic.address.trim()}
                      </span>
                    ) : (
                      <span className="block text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="min-w-0 px-1 py-1 align-middle text-center text-[var(--text-strong)] sm:px-1.5 sm:py-1.5 print:px-1.5">
                    <Link
                      href={`/clients/doctors/${o.doctor.id}`}
                      title={o.doctor.fullName}
                      className="block break-words text-center text-[var(--sidebar-blue)] hover:underline sm:leading-snug"
                    >
                      {personNameSurnameInitials(o.doctor.fullName)}
                    </Link>
                  </td>
                  <td
                    className="min-w-0 px-1 py-1 align-middle text-center text-[var(--text-body)] sm:px-1.5 sm:py-1.5 print:px-1.5"
                    title={o.patientName ?? undefined}
                  >
                    <span className="block hyphens-auto break-words">
                      {o.patientName
                        ? personNameSurnameInitials(o.patientName)
                        : "—"}
                    </span>
                  </td>
                  <td className="min-w-0 whitespace-nowrap px-1 py-1 align-middle text-[var(--text-secondary)] sm:px-1.5 sm:py-1.5 print:px-1.5">
                    {formatAdmission(o)}
                  </td>
                  <td className="min-w-0 px-1 py-1 align-middle text-[var(--text-secondary)] sm:px-1.5 sm:py-1.5 print:px-1.5">
                    <OrderListDueCell
                      orderId={o.id}
                      dueIso={o.dueDate?.toISOString() ?? null}
                      createdAtIso={o.createdAt.toISOString()}
                      labHmSlots={labDueHmSlots}
                    />
                  </td>
                  <td className="min-w-0 px-1 py-1 align-middle text-[var(--text-secondary)] sm:px-1.5 sm:py-1.5 print:px-1.5">
                    <OrderListDueCell
                      variant="appointment"
                      orderId={o.id}
                      dueIso={
                        o.appointmentDate?.toISOString() ??
                        o.dueToAdminsAt?.toISOString() ??
                        null
                      }
                      createdAtIso={o.createdAt.toISOString()}
                    />
                  </td>
                  {showAccountantColumns ? (
                    <>
                      <td className="min-w-0 whitespace-pre-wrap px-1 py-1 align-top text-left text-[11px] leading-snug text-[var(--text-body)] sm:px-1.5 sm:py-1.5 print:px-1.5 print:text-[10px]">
                        {o.counterpartyRequisitesText?.trim() ? (
                          <span className="block hyphens-auto break-words">
                            {o.counterpartyRequisitesText.trim()}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="min-w-0 whitespace-pre-wrap px-1 py-1 align-top text-left text-[11px] leading-snug text-[var(--text-body)] sm:px-1.5 sm:py-1.5 print:px-1.5 print:text-[10px]">
                        {o.legalEntity?.trim() ? (
                          <span className="block hyphens-auto break-words">
                            {o.legalEntity.trim()}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    </>
                  ) : null}
                  <td
                    data-shipped-cell
                    className="min-w-0 px-1 py-1 text-center align-middle sm:px-1.5 sm:py-1.5 print:hidden"
                  >
                    <OrderShippedToggle
                      orderId={o.id}
                      shipped={workSent}
                      shippedAtIso={o.adminShippedAt?.toISOString() ?? null}
                    />
                  </td>
                  <td className="min-w-0 max-w-0 overflow-hidden px-1 py-1 align-top sm:px-1.5 sm:py-1.5 print:px-1.5">
                    <div className="min-w-0 max-w-full overflow-hidden">
                      {renderTagsCell()}
                    </div>
                  </td>
                </tr>
                <tr
                  className="border-b border-[var(--card-border)] shell-desktop:hidden print:hidden"
                >
                  <td colSpan={99} className="p-0">
                    <div className={["p-3", mobileCardAccent].filter(Boolean).join(" ")}>
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
                            kaitenTrackLane={o.kaitenTrackLane}
                            kaitenBlocked={blocked}
                            kaitenBlockReason={o.kaitenBlockReason}
                            filterHref={kaitenStatusFilterHref}
                            boardFilterHref={boardFilterHref}
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

                      {address ? (
                        <div
                          className="mb-0.5 truncate text-xs text-[var(--text-secondary)]"
                          title={address}
                        >
                          {address}
                        </div>
                      ) : null}

                      <div className="mb-1.5 flex flex-wrap gap-1.5 text-sm font-semibold text-[var(--app-text)]">
                        {doctorName ? <span>{doctorName}</span> : null}
                        {doctorName && patientName ? (
                          <span className="text-[var(--text-muted)]">·</span>
                        ) : null}
                        {patientName ? <span>{patientName}</span> : null}
                      </div>

                      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                        {labDate ? (
                          <span>
                            <span className="font-medium text-[var(--text-secondary)]">
                              ЛАБ{" "}
                            </span>
                            {labDate}
                          </span>
                        ) : null}
                        {appointmentDate ? (
                          <span>
                            <span className="font-medium text-[var(--text-secondary)]">
                              Запись{" "}
                            </span>
                            {appointmentDate}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 [&_a]:inline-flex [&_a]:min-h-[44px] [&_a]:min-w-[44px] [&_a]:items-center [&_a]:justify-center [&_button]:min-h-[44px] [&_button]:min-w-[44px]">
                        <Link
                          href={orderPathById(o.id)}
                          className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-sm font-medium text-[var(--text-strong)] active:bg-[var(--surface-hover)]"
                          title={`${o.orderNumber} — открыть наряд`}
                        >
                          Открыть
                        </Link>
                        <div className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
                          <OrderListOrderChatCell
                            orderId={o.id}
                            orderNumber={o.orderNumber}
                            patientName={patientName || undefined}
                            doctorName={doctorName || undefined}
                            labMentionHighlight={o.listKaitenLabMentionHighlight}
                            embedded
                          />
                        </div>
                        <div className="flex items-center gap-1 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-1">
                          {renderPrintActions()}
                        </div>
                        <div className="min-h-[44px] flex-1 rounded-lg bg-[var(--surface-subtle)] px-2 py-1">
                          <OrderShippedToggle
                            orderId={o.id}
                            shipped={workSent}
                            shippedAtIso={o.adminShippedAt?.toISOString() ?? null}
                          />
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-[var(--text-secondary)] [&_.order-list-tags-pack]:items-center">
                        {renderTagsCell({ omitKaitenColumnTag: true })}
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
      </ShipmentsListChrome>
    </div>
  );
}
