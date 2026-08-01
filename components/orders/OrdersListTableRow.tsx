"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { OrderListKaitenColumnTag } from "@/components/orders/OrderListKaitenColumnTag";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import { orderPathById } from "@/lib/order-public-ref";

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

/**
 * Строка списка нарядов: клик по пустой области ведёт в карточку наряда
 * (клики по ссылкам, кнопкам и полям — без перехода).
 * tagsNode монтируется один раз: desktop td или mobile-карточка (matchMedia).
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
  demoKanbanColumn,
  demoCardTypeName,
  kaitenCardId = null,
  kaitenBlocked = false,
  kaitenBlockReason = null,
  kaitenFilterHref = null,
  harmonyRowState = "default",
  isLabOverdue = false,
  mobileActionsNode,
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
  demoKanbanColumn?: string | null;
  demoCardTypeName?: string | null;
  kaitenCardId?: number | null;
  kaitenBlocked?: boolean;
  kaitenBlockReason?: string | null;
  kaitenFilterHref?: string | null;
  harmonyRowState?: "blocked" | "shipped" | "default";
  isLabOverdue?: boolean;
  mobileActionsNode?: ReactNode;
  tagsNode?: ReactNode;
}) {
  const router = useRouter();
  const isHarmony = useUiDesign() === "harmony";
  const href = orderPathById(orderId);
  /** SSR + первый paint: desktop (false). После mount — реальный viewport; один tagsNode. */
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const go = (e: MouseEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(href);
  };

  const desktopRowClass = isHarmony
    ? "orders-harmony-data-row hidden cursor-pointer md:table-row print:table-row"
    : className
      ? `hidden md:table-row print:table-row ${className} cursor-pointer`
      : "hidden cursor-pointer md:table-row print:table-row";

  return (
    <>
      <tr
        className={desktopRowClass}
        {...(isHarmony ? { "data-harmony-row": harmonyRowState } : {})}
        onClick={(e) => {
          if (targetInsideInteractive(e.target)) return;
          go(e);
        }}
      >
        {children}
        {tagsNode ? (
          <td className="min-w-0 px-1 py-1 align-top sm:px-1.5 sm:py-1.5">
            {!isNarrow ? tagsNode : null}
          </td>
        ) : null}
      </tr>
      <tr className="border-b border-[var(--card-border)] md:hidden print:hidden">
        <td colSpan={99} className="p-0">
          <div className="p-3">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col items-start gap-1">
                <Link
                  href={href}
                  className="font-mono text-base font-bold leading-none text-[var(--sidebar-blue)] hover:underline"
                  title={`${orderNumber} — открыть наряд`}
                >
                  № {orderNumber}
                </Link>
                <OrderListKaitenColumnTag
                  kaitenCardId={kaitenCardId}
                  demoKanbanColumn={demoKanbanColumn}
                  demoCardTypeName={demoCardTypeName}
                  kaitenColumnTitle={kaitenColumnTitle ?? null}
                  kaitenBlocked={kaitenBlocked}
                  kaitenBlockReason={kaitenBlockReason}
                  filterHref={kaitenFilterHref}
                  placement="underOrderNumber"
                />
              </div>
              {labDate ? (
                <span
                  className={[
                    "mt-0.5 shrink-0 text-xs",
                    isLabOverdue
                      ? "font-semibold text-red-600"
                      : "text-[var(--text-muted)]",
                  ].join(" ")}
                >
                  {labDate}
                </span>
              ) : null}
            </div>

            {clinicName ? (
              <div className="mb-0.5 truncate text-xs font-normal text-[var(--text-secondary)]">
                {clinicName}
              </div>
            ) : null}

            {clinicAddress ? (
              <div
                className="mb-0.5 truncate text-xs text-[var(--text-secondary)]"
                title={clinicAddress}
              >
                {clinicAddress}
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
                  <span
                    className={
                      isLabOverdue ? "font-semibold text-red-600" : undefined
                    }
                  >
                    {labDate}
                  </span>
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

            {mobileActionsNode ? (
              <div className="flex flex-wrap items-center gap-2 [&_a]:inline-flex [&_a]:min-h-[44px] [&_a]:min-w-[44px] [&_a]:items-center [&_a]:justify-center [&_button]:min-h-[44px] [&_button]:min-w-[44px]">
                {mobileActionsNode}
              </div>
            ) : null}

            {tagsNode && isNarrow ? (
              <div className="mt-2 text-xs text-[var(--text-secondary)]">
                {tagsNode}
              </div>
            ) : null}
          </div>
        </td>
      </tr>
    </>
  );
}
