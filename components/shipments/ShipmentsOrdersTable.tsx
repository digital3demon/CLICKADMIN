import Link from "next/link";
import { OrderKaitenQrModal } from "@/components/orders/OrderKaitenQrModal";
import { OrderListDueCell } from "@/components/orders/OrderListDueCell";
import { OrderListKaitenPoller } from "@/components/orders/OrderListKaitenPoller";
import { OrderListTagsCell } from "@/components/orders/OrderListTagsCell";
import { OrderNarjadPrintTrigger } from "@/components/orders/OrderNarjadPrintTrigger";
import { ShipmentsPrintButton } from "@/components/shipments/ShipmentsPrintButton";
import type { ShipmentOrderRow } from "@/lib/fetch-shipments-orders";
import { getKaitenCardWebUrl } from "@/lib/kaiten-card-web-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { clampOrdersPageSize } from "@/lib/orders-list-cursor";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";

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
}: {
  orders: ShipmentOrderRow[];
  emptyHint: string;
  /** Подзаголовок: при печати всегда из `listHeading`; на экране — если `listHeadingScreen`. */
  listHeading?: string;
  /** Показывать `listHeading` в панели над таблицей (если текст перенесён в форму периода — false). */
  listHeadingScreen?: boolean;
  isDemo?: boolean;
  siteOrigin?: string | null;
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
      <div className="shipments-print-area w-full max-w-full min-w-0 overflow-y-visible rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm print:max-w-none print:w-full print:overflow-visible print:border-zinc-400 print:shadow-none">
        {listHeading && !listHeadingScreen ? (
          <p className="hidden border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 pb-2 pt-2 text-sm font-semibold text-[var(--text-body)] print:block print:mb-0 print:border-b-0 print:bg-transparent print:px-0 print:pt-0 print:text-base">
            {listHeading}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 py-2 sm:flex-row sm:items-center md:grid md:grid-cols-[minmax(4.25rem,6rem)_minmax(0,1fr)] md:items-center md:gap-x-2">
          <div className="flex shrink-0 justify-start">
            <ShipmentsPrintButton />
          </div>
          {listHeading && listHeadingScreen ? (
            <p className="min-w-0 text-sm font-medium text-[var(--text-body)] print:mb-2 print:text-base print:font-semibold">
              {listHeading}
            </p>
          ) : null}
        </div>
        <div className="min-w-0 overflow-x-auto overflow-y-visible overscroll-x-contain [-webkit-overflow-scrolling:touch] print:overflow-visible">
        <table className="w-max max-w-full min-w-0 border-collapse text-left text-sm print:table-auto">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase leading-tight tracking-wide text-[var(--text-secondary)] print:bg-[var(--card-bg)]">
              <th
                className="max-md:hidden min-w-0 whitespace-nowrap px-2 py-2 text-center normal-case print:hidden"
                aria-label="Отметка «Работа отправлена», печать PDF и QR"
                title="Галочка — работа отправлена; иконки — печать PDF и QR на карточку Kaiten"
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
                title="Запись: дата и время приёма пациента"
              >
                Запись
              </th>
              <th
                className="min-w-0 whitespace-nowrap px-2 py-2 text-center print:px-1.5"
                title="Срок лабораторный"
              >
                Лаборатория
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
                      ? "border-b-2 border-emerald-400/55 bg-emerald-300/55 text-emerald-950/90 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100/85 print:border-zinc-400 [&>td:not(:first-child):not(:last-child)]:opacity-[0.28] [&>td:not(:first-child):not(:last-child)]:saturate-[0.65] [&>td:last-child]:opacity-[0.88]"
                      : "border-b-2 border-[var(--card-border)] transition-colors hover:bg-[var(--table-row-hover)]"
                  }
                >
                  <td className="max-md:hidden min-w-0 px-2 py-2 align-middle print:hidden">
                    <div className="flex min-w-0 flex-nowrap items-center justify-start gap-0.5 sm:gap-1">
                      {workSent ? (
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-600/25 dark:ring-emerald-400/25 sm:h-7 sm:w-7"
                          title="Работа отправлена"
                          aria-label="Работа отправлена"
                        >
                          <svg
                            className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : null}
                      {!workSent ? (
                        <OrderNarjadPrintTrigger
                          orderId={o.id}
                          variant="icon"
                          title="Печать наряда (PDF) — диалог печати"
                        />
                      ) : null}
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
                      href={`/orders/${o.id}`}
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
                  <td className="min-w-0 px-2 py-2 align-middle text-[var(--text-secondary)] print:px-1.5">
                    <OrderListDueCell
                      orderId={o.id}
                      dueIso={o.dueDate?.toISOString() ?? null}
                      createdAtIso={o.createdAt.toISOString()}
                    />
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
                      adminShippedOtpr={o.adminShippedOtpr}
                      kaitenBlocked={o.kaitenBlocked === true}
                      kaitenBlockReason={o.kaitenBlockReason}
                      isUrgent={o.isUrgent}
                      urgentCoefficient={o.urgentCoefficient}
                      customTags={o.listCustomTags}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
