"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { OrderListCardTypeTag } from "@/components/orders/OrderListCardTypeTag";
import { OrderListKaitenColumnTag } from "@/components/orders/OrderListKaitenColumnTag";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import {
  orderListMobileCardAccentClass,
  type OrderListHarmonyRowState,
  type OrderListRowAccentKind,
} from "@/lib/order-list-row-accent";
import { orderPathById } from "@/lib/order-public-ref";
import { SHELL_LAPTOP_MEDIA } from "@/lib/crm-layout-tiers";
import { crmCityAddressTextClass } from "@/lib/crm-lab-city";

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

function subscribeNarrow(cb: () => void) {
  const mq = window.matchMedia(SHELL_LAPTOP_MEDIA);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getNarrowSnapshot() {
  return !window.matchMedia(SHELL_LAPTOP_MEDIA).matches;
}

/** SSR mobile-first: на телефоне нет вспышки десктоп-таблицы. */
function getNarrowServerSnapshot() {
  return true;
}

/**
 * Строка списка нарядов: клик по пустой области ведёт в карточку наряда
 * (клики по ссылкам, кнопкам и полям — без перехода).
 * Одна `<tr>` на наряд: desktop-table или mobile-карточка (matchMedia).
 */
export function OrdersListTableRow({
  orderId,
  orderNumber,
  className,
  children,
  clinicName,
  clinicAddress,
  doctorName,
  patientName,
  labDate,
  appointmentDate,
  kaitenColumnTitle,
  kaitenTrackLane = null,
  demoKanbanColumn,
  demoCardTypeName,
  kaitenCardId = null,
  kaitenBlocked = false,
  kaitenBlockReason = null,
  kaitenFilterHref = null,
  boardFilterHref = null,
  harmonyRowState = "default",
  rowAccent = null,
  isLabOverdue = false,
  isDemoMode = false,
  mobileActionsNode,
  mobileShippedNode,
  mobileDatesNode,
  tagsNode,
}: {
  orderId: string;
  orderNumber: string;
  className?: string;
  children: ReactNode;
  clinicName?: string;
  clinicAddress?: string;
  doctorName?: string;
  patientName?: string;
  labDate?: string;
  appointmentDate?: string;
  kaitenColumnTitle?: string | null;
  kaitenTrackLane?: string | null;
  demoKanbanColumn?: string | null;
  demoCardTypeName?: string | null;
  kaitenCardId?: number | null;
  kaitenBlocked?: boolean;
  kaitenBlockReason?: string | null;
  kaitenFilterHref?: string | null;
  boardFilterHref?: string | null;
  harmonyRowState?: OrderListHarmonyRowState;
  /** Цветная рамка: корректировки (янтарь) / запрос протетики (голубой). */
  rowAccent?: OrderListRowAccentKind | null;
  isLabOverdue?: boolean;
  isDemoMode?: boolean;
  mobileActionsNode?: ReactNode;
  /** Галочка отгрузки — в шапке рядом с № / статусом. */
  mobileShippedNode?: ReactNode;
  /** Пикеры ЛАБ / Запись справа от иконок. */
  mobileDatesNode?: ReactNode;
  tagsNode?: ReactNode;
}) {
  const router = useRouter();
  const isHarmony = useUiDesign() === "harmony";
  const href = orderPathById(orderId);
  const isNarrow = useSyncExternalStore(
    subscribeNarrow,
    getNarrowSnapshot,
    getNarrowServerSnapshot,
  );

  const go = (e: MouseEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(href);
  };

  const desktopRowClass = isHarmony
    ? "orders-harmony-data-row cursor-pointer print:table-row"
    : className
      ? `${className} cursor-pointer print:table-row`
      : "cursor-pointer print:table-row";
  const mobileCardAccent = orderListMobileCardAccentClass(rowAccent);
  const mobileCardClass = [
    "cursor-pointer p-3",
    mobileCardAccent ||
      (kaitenBlocked
        ? "rounded-lg border-2 border-red-500/55 bg-red-50/35 dark:border-red-700/55 dark:bg-red-950/25"
        : ""),
  ]
    .filter(Boolean)
    .join(" ");

  if (isNarrow) {
    return (
      <tr
        className="border-b border-[var(--card-border)] print:hidden"
        suppressHydrationWarning
      >
        <td colSpan={99} className="p-0">
          <div
            className={mobileCardClass}
            role="link"
            tabIndex={0}
            aria-label={`Открыть наряд ${orderNumber}`}
            onClick={(e) => {
              if (targetInsideInteractive(e.target)) return;
              go(e);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              if (targetInsideInteractive(e.target)) return;
              e.preventDefault();
              if (e.metaKey || e.ctrlKey) {
                window.open(href, "_blank", "noopener,noreferrer");
                return;
              }
              router.push(href);
            }}
          >
            <div className="mb-2 flex min-w-0 items-center gap-2">
              <Link
                prefetch={false}
                href={href}
                className="shrink-0 font-mono text-base font-bold leading-none text-[var(--sidebar-blue)] hover:underline"
                title={`${orderNumber} — открыть наряд`}
              >
                № {orderNumber}
              </Link>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-hidden">
                <OrderListKaitenColumnTag
                  kaitenCardId={kaitenCardId}
                  demoKanbanColumn={demoKanbanColumn}
                  demoCardTypeName={demoCardTypeName}
                  kaitenColumnTitle={kaitenColumnTitle ?? null}
                  kaitenTrackLane={kaitenTrackLane}
                  kaitenBlocked={kaitenBlocked}
                  kaitenBlockReason={kaitenBlockReason}
                  filterHref={kaitenFilterHref}
                  boardFilterHref={boardFilterHref}
                  placement="underOrderNumber"
                  boardLayout="inline"
                  isDemoMode={isDemoMode}
                  includeCardType={false}
                />
                <OrderListCardTypeTag
                  name={demoCardTypeName}
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

            {mobileActionsNode || mobileDatesNode || mobileShippedNode ? (
              <div className="flex min-w-0 items-center gap-1.5">
                {mobileActionsNode ? (
                  <div
                    className="flex shrink-0 items-center gap-1"
                    data-row-click-ignore
                    onClick={(e) => e.stopPropagation()}
                  >
                    {mobileActionsNode}
                  </div>
                ) : null}
                {mobileDatesNode ? (
                  <div
                    className="flex min-w-0 flex-1 items-center justify-end gap-2"
                    data-row-click-ignore
                    onClick={(e) => e.stopPropagation()}
                  >
                    {mobileDatesNode}
                  </div>
                ) : null}
                {mobileShippedNode ? (
                  <div
                    className="shrink-0"
                    data-row-click-ignore
                    onClick={(e) => e.stopPropagation()}
                  >
                    {mobileShippedNode}
                  </div>
                ) : null}
              </div>
            ) : null}

            {tagsNode ? (
              <div
                className="mt-2.5 text-xs text-[var(--text-secondary)]"
                data-row-click-ignore
                onClick={(e) => e.stopPropagation()}
              >
                {tagsNode}
              </div>
            ) : null}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      className={desktopRowClass}
      {...(isHarmony ? { "data-harmony-row": harmonyRowState } : {})}
      suppressHydrationWarning
      onClick={(e) => {
        if (targetInsideInteractive(e.target)) return;
        go(e);
      }}
    >
      {children}
      {tagsNode ? (
        <td
          data-col="tags"
          className="min-w-0 px-1 py-1 align-top sm:px-1.5 sm:py-1.5"
        >
          <div data-col-body>{tagsNode}</div>
        </td>
      ) : null}
    </tr>
  );
}
