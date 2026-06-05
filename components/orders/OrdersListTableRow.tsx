"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import {
  getKaitenColumnPillClassFromOrder,
  getOrderWarnings,
  resolveKaitenColumnTitleForDisplay,
} from "@/lib/order-status-display";
import {
  kaitenOrderToHarmonyTone,
  resolveListPillClass,
} from "@/lib/harmony-list-pill";
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
 */
export function OrdersListTableRow({
  orderId,
  orderNumber,
  className,
  children,
  clinicName,
  doctorName,
  patientName,
  labDate,
  appointmentDate,
  shipDate,
  kaitenColumnTitle,
  hasUnreadChat = false,
  hasPrint = false,
  hasCorrection = false,
  hasProsthetics = false,
  isLabOverdue = false,
  demoKanbanColumn,
  harmonyRowState = "default",
  tagsNode,
  indicatorsNode,
}: {
  orderId: string;
  orderNumber: string;
  className?: string;
  children: ReactNode;
  clinicName?: string;
  doctorName?: string;
  patientName?: string;
  labDate?: string;
  appointmentDate?: string;
  shipDate?: string;
  kaitenColumnTitle?: string | null;
  hasUnreadChat?: boolean;
  hasPrint?: boolean;
  hasCorrection?: boolean;
  hasProsthetics?: boolean;
  isLabOverdue?: boolean;
  demoKanbanColumn?: string | null;
  harmonyRowState?: "blocked" | "shipped" | "default";
  tagsNode?: ReactNode;
  indicatorsNode?: ReactNode;
}) {
  const router = useRouter();
  const isHarmony = useUiDesign() === "harmony";
  const href = orderPathById(orderId);
  const kaitenPillClass = getKaitenColumnPillClassFromOrder({
    kaitenColumnTitle,
    demoKanbanColumn,
  });
  const kaitenBadgeLabel = resolveKaitenColumnTitleForDisplay({
    kaitenColumnTitle,
    demoKanbanColumn,
  });
  const kaitenHarmonyTone = kaitenOrderToHarmonyTone({
    kaitenColumnTitle,
    demoKanbanColumn,
  });
  const mobileKaitenPillClass = isHarmony
    ? resolveListPillClass(true, "", kaitenHarmonyTone)
    : `inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${kaitenPillClass}`;
  const orderWarnings = getOrderWarnings({
    isOverdue: isLabOverdue,
    hasCorrection,
    hasProsthetics,
    hasMention: hasUnreadChat,
  });

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
        title={`${orderNumber} — открыть наряд (клик по строке)`}
      >
        {children}
      </tr>
      <tr className="border-b border-[var(--card-border)] md:hidden print:hidden">
        <td colSpan={99} className="p-0">
          <div
            className="cursor-pointer p-3 transition-colors duration-100 active:bg-[var(--surface-hover)]"
            onClick={(e) => {
              if (targetInsideInteractive(e.target)) return;
              go(e);
            }}
            title={`${orderNumber} — открыть наряд (клик по строке)`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-[var(--text-strong)]">
                № {orderNumber}
              </span>
              {kaitenBadgeLabel ? (
                <span
                  className="max-w-[140px] shrink-0 truncate"
                  title={kaitenBadgeLabel}
                >
                  <span className={mobileKaitenPillClass}>{kaitenBadgeLabel}</span>
                </span>
              ) : null}
            </div>

            {clinicName ? (
              <div className="mb-0.5 truncate text-sm font-medium text-[var(--app-text)]">
                {clinicName}
              </div>
            ) : null}

            <div className="mb-1.5 flex flex-wrap gap-1.5 text-xs text-[var(--text-secondary)]">
              {doctorName ? <span>{doctorName}</span> : null}
              {doctorName && patientName ? (
                <span className="text-[var(--text-muted)]">·</span>
              ) : null}
              {patientName ? <span>{patientName}</span> : null}
            </div>

            <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
              {labDate ? (
                <span>
                  <span className="font-medium text-[var(--text-secondary)]">
                    ЛАБ{" "}
                  </span>
                  <span
                    className={
                      isLabOverdue
                        ? "font-semibold text-red-600"
                        : undefined
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
              {shipDate ? (
                <span>
                  <span className="font-medium text-[var(--text-secondary)]">
                    Отправка{" "}
                  </span>
                  {shipDate}
                </span>
              ) : null}
            </div>

            {tagsNode || indicatorsNode || hasUnreadChat || hasPrint || orderWarnings.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {hasUnreadChat ? (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <span aria-hidden>💬</span>
                    чат
                  </span>
                ) : null}
                {hasPrint ? (
                  <span className="inline-flex items-center rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]">
                    печать
                  </span>
                ) : null}
                {orderWarnings
                  .filter((w) => w.label !== "Упоминание" || !hasUnreadChat)
                  .map((w) => (
                    <span
                      key={w.label}
                      title={w.label}
                      className="text-[10px] font-bold leading-none"
                      aria-label={w.label}
                    >
                      {w.icon}
                    </span>
                  ))}
                {indicatorsNode}
                {tagsNode}
              </div>
            ) : null}
          </div>
        </td>
      </tr>
    </>
  );
}
