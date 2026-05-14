import Link from "next/link";
import { OrderKaitenQrModal } from "@/components/orders/OrderKaitenQrModal";
import { OrderListDueCell } from "@/components/orders/OrderListDueCell";
import { OrderListKaitenPoller } from "@/components/orders/OrderListKaitenPoller";
import { OrderShippedToggle } from "@/components/orders/OrderShippedToggle";
import { OrderListTagsCell } from "@/components/orders/OrderListTagsCell";
import { OrderNarjadPrintTrigger } from "@/components/orders/OrderNarjadPrintTrigger";
import { ShipmentsPrintButton } from "@/components/shipments/ShipmentsPrintButton";
import { StickyListChrome } from "@/components/layout/StickyListChrome";
import type { ShipmentOrderRow } from "@/lib/fetch-shipments-orders";
import { getKaitenCardWebUrl } from "@/lib/kaiten-card-web-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { clampOrdersPageSize } from "@/lib/orders-list-cursor";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { orderPathById } from "@/lib/order-public-ref";

const TAGS_PAGE_SIZE = clampOrdersPageSize(null);

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

  return (
    <div className="w-full min-w-0">
      {!isDemo ? (
        <OrderListKaitenPoller
          orderIds={orders
            .filter((o) => o.kaitenCardId != null)
            .map((o) => o.id)}
        />
      ) : null}
      <StickyListChrome
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
          </>
        }
      >
        <div className="min-w-0 overflow-x-auto overflow-y-visible xl:overflow-x-visible [-webkit-overflow-scrolling:touch] print:overflow-visible">
        <table className="w-max max-w-full min-w-0 border-collapse text-left text-sm print:table-auto">
          <thead className="xl:sticky xl:top-[var(--sticky-list-toolbar-height,0px)] xl:z-30 print:static">
            <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase leading-tight tracking-wide text-[var(--text-secondary)] print:bg-[var(--card-bg)]">
              <th
                className="max-md:hidden min-w-0 whitespace-nowrap px-2 py-2 text-center normal-case print:hidden"
                aria-label="Печать PDF и QR"
                title="Печать PDF наряда и QR на карточку Kaiten"
              >
                PDF · QR
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-2 py-2 text-center print:px-1.5"
                title="№ наряда"
              >
                № наряда
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-2 py-2 text-center print:px-1.5"
                title="Клиника"
              >
                Клиника
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-2 py-2 text-center print:px-1.5"
                title="Адрес клиники"
              >
                Адрес
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-2 py-2 text-center print:px-1.5"
                title="Врач"
              >
                Врач
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-2 py-2 text-center print:px-1.5"
                title="Пациент"
              >
                Пациент
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-2 py-2 text-center print:px-1.5"
                title="Поступление: когда работа зашла в лабораторию (без даты — дата занесения наряда)"
              >
                Поступление
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-2 py-2 text-center print:px-1.5"
                title="Срок лабораторный"
              >
                Лаборатория
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-2 py-2 text-center print:px-1.5"
                title="Запись: дата и время приёма пациента"
              >
                Запись
              </th>
              {showAccountantColumns ? (
                <>
                  <th
                    className="min-w-[14rem] max-w-[22rem] px-2 py-2 text-center align-top normal-case print:max-w-none print:px-1.5"
                    title="ИНН, КПП, банк, р/с и др. по карточке клиники или ИП врача"
                  >
                    Реквизиты
                  </th>
                  <th
                    className="min-w-[10rem] max-w-[14rem] px-2 py-2 text-center align-top normal-case print:max-w-none print:px-1.5"
                    title="С какого юрлица лаборатории ведётся наряд (поле в наряде)"
                  >
                    Наше юрлицо
                  </th>
                </>
              ) : null}
              <th
                className="min-w-0 whitespace-nowrap px-2 py-2 text-center normal-case print:hidden"
                title="Отправка работы"
              >
                Отправка
              </th>
              <th
                className="min-w-[11rem] whitespace-nowrap px-2 py-2 text-center align-top normal-case print:px-1.5"
                title="Отметки: как на странице «Заказы»"
              >
                Отметки
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const kaitenUrl =
                isDemo && siteOrigin
                  ? `${siteOrigin.replace(/\/$/, "")}${kanbanOrderDeepLinkPath(o.id)}`
                  : o.kaitenCardId != null
                    ? getKaitenCardWebUrl(o.kaitenCardId)
                    : null;
              const workSent = o.adminShippedOtpr;
              return (
                <tr
                  key={o.id}
                  className={
                    workSent
                      ? "border-b-2 border-emerald-400/55 bg-emerald-300/55 text-emerald-950/90 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100/85 print:border-zinc-400 [&>td:not(:first-child):not(:last-child):not([data-shipped-cell])]:opacity-[0.28] [&>td:not(:first-child):not(:last-child):not([data-shipped-cell])]:saturate-[0.65] [&>td:last-child]:opacity-[0.88]"
                      : "border-b-2 border-[var(--card-border)] transition-colors hover:bg-[var(--table-row-hover)]"
                  }
                >
                  <td className="max-md:hidden min-w-0 px-2 py-2 align-middle print:hidden">
                    <div className="flex min-w-0 flex-nowrap items-center justify-start gap-0.5 sm:gap-1">
                      <OrderNarjadPrintTrigger
                        orderId={o.id}
                        variant="icon"
                        title="Печать наряда (PDF) — диалог печати"
                      />
                      {kaitenUrl ? (
                        <OrderKaitenQrModal
                          url={kaitenUrl}
                          compact
                          variant={isDemo ? "kanban" : "kaiten"}
                        />
                      ) : o.kaitenCardId != null ? (
                        <span
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-xs text-amber-600 dark:text-amber-400 sm:h-7 sm:w-7 sm:text-sm"
                          title="Задайте KAITEN_WEB_ORIGIN или KAITEN_CARD_URL_TEMPLATE"
                        >
                          ⚠
                        </span>
                      ) : (
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-[var(--text-muted)] sm:h-7 sm:w-7">
                          —
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="min-w-0 whitespace-nowrap px-2 py-2 align-middle font-mono font-medium text-[var(--app-text)] print:px-1.5">
                    <Link
                      href={orderPathById(o.id)}
                      className="text-[var(--sidebar-blue)] hover:underline"
                      title={`${o.orderNumber} — открыть наряд`}
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="min-w-0 max-w-[12rem] px-2 py-2 align-middle text-[var(--text-strong)] print:max-w-none print:px-1.5">
                    {o.clinic ? (
                      <Link
                        href={`/clients/${o.clinic.id}`}
                        title={o.clinic.name}
                        className="block hyphens-auto break-words text-[var(--sidebar-blue)] hover:underline"
                      >
                        {o.clinic.name}
                      </Link>
                    ) : (
                      <span className="block break-words text-[var(--text-secondary)]">
                        Частное лицо
                      </span>
                    )}
                  </td>
                  <td className="min-w-0 max-w-[12rem] px-2 py-2 align-middle text-[var(--text-body)] print:max-w-none print:px-1.5">
                    {o.clinic?.address?.trim() ? (
                      <span
                        className="block hyphens-auto break-words text-[var(--text-secondary)]"
                        title={o.clinic.address.trim()}
                      >
                        {o.clinic.address.trim()}
                      </span>
                    ) : (
                      <span className="block text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="min-w-0 max-w-[10rem] px-2 py-2 align-middle text-[var(--text-strong)] print:max-w-none print:px-1.5">
                    <Link
                      href={`/clients/doctors/${o.doctor.id}`}
                      title={o.doctor.fullName}
                      className="block break-words text-[var(--sidebar-blue)] hover:underline sm:leading-snug"
                    >
                      {personNameSurnameInitials(o.doctor.fullName)}
                    </Link>
                  </td>
                  <td
                    className="min-w-0 max-w-[10rem] px-2 py-2 align-middle text-[var(--text-body)] print:max-w-none print:px-1.5"
                    title={o.patientName ?? undefined}
                  >
                    <span className="block hyphens-auto break-words">
                      {o.patientName
                        ? personNameSurnameInitials(o.patientName)
                        : "—"}
                    </span>
                  </td>
                  <td className="min-w-0 whitespace-nowrap px-2 py-2 align-middle text-xs text-[var(--text-secondary)] print:px-1.5">
                    {formatAdmission(o)}
                  </td>
                  <td className="min-w-0 px-2 py-2 align-middle text-[var(--text-secondary)] print:px-1.5">
                    <OrderListDueCell
                      orderId={o.id}
                      dueIso={o.dueDate?.toISOString() ?? null}
                      createdAtIso={o.createdAt.toISOString()}
                      labHmSlots={labDueHmSlots}
                    />
                  </td>
                  <td className="min-w-0 px-2 py-2 align-middle text-[var(--text-secondary)] print:px-1.5">
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
                      <td className="min-w-[14rem] max-w-[22rem] whitespace-pre-wrap px-2 py-2 align-top text-left text-[11px] leading-snug text-[var(--text-body)] print:max-w-none print:px-1.5 print:text-[10px]">
                        {o.counterpartyRequisitesText?.trim() ? (
                          <span className="block hyphens-auto break-words">
                            {o.counterpartyRequisitesText.trim()}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="min-w-[10rem] max-w-[14rem] whitespace-pre-wrap px-2 py-2 align-top text-left text-[11px] leading-snug text-[var(--text-body)] print:max-w-none print:px-1.5 print:text-[10px]">
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
                    className="min-w-0 px-2 py-2 text-center align-middle print:hidden"
                  >
                    <OrderShippedToggle orderId={o.id} shipped={workSent} />
                  </td>
                  <td className="min-w-[11rem] px-2 py-2 align-top print:px-1.5">
                    <OrderListTagsCell
                      orderId={o.id}
                      pageSize={TAGS_PAGE_SIZE}
                      orderAttentionWarning={
                        o.listCompositionMismatch ||
                        o.listPendingChatCorrections
                      }
                      kaitenCardId={o.kaitenCardId}
                      demoKanbanColumn={o.demoKanbanColumn}
                      demoCardTypeName={o.kaitenCardType?.name ?? null}
                      kaitenColumnTitle={o.kaitenColumnTitle}
                      prostheticsOrdered={o.prostheticsOrdered}
                      listPendingProstheticsRequests={
                        o.listPendingProstheticsRequests
                      }
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
                      shipmentsFilterContext={shipmentsTagFilterContext}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </StickyListChrome>
    </div>
  );
}
