"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import { ordersListPeriodDefaultDraft } from "@/lib/orders-list-period";
import {
  normalizeOrdersSearchQuery,
  ordersListHref,
} from "@/lib/orders-list-query";
import { ordersShipmentListPdfHref } from "@/lib/orders-shipment-list-query";
import { moscowTodayYmd } from "@/lib/shipments-date-range";

type Props = {
  pageSize: number;
  appliedShipFrom: string | null;
  appliedShipTo: string | null;
  shipMode: "actual" | "period" | null;
  /** Суффикс id — мобильная/десктопная копия на одной странице. */
  idSuffix?: string;
};

/**
 * Макет: одна плотная строка — Запись · Актуальное · за период · даты · Показать · Печать.
 * Высота как у полосы пилюль.
 */
export function OrdersShipmentPanel({
  pageSize,
  appliedShipFrom,
  appliedShipTo,
  shipMode,
  idSuffix = "",
}: Props) {
  const fromId = idSuffix
    ? `orders-ship-from-${idSuffix}`
    : "orders-ship-from";
  const toId = idSuffix ? `orders-ship-to-${idSuffix}` : "orders-ship-to";
  const router = useRouter();
  const sp = useSearchParams();
  const isHarmony = useUiDesign() === "harmony";
  const defaultDraft = useMemo(() => ordersListPeriodDefaultDraft(), []);
  const [from, setFrom] = useState(
    () => appliedShipFrom ?? defaultDraft.from,
  );
  const [to, setTo] = useState(() => appliedShipTo ?? moscowTodayYmd());

  useEffect(() => {
    setFrom(appliedShipFrom ?? defaultDraft.from);
    setTo(appliedShipTo ?? moscowTodayYmd());
  }, [appliedShipFrom, appliedShipTo, defaultDraft.from]);

  const commonHrefOpts = useCallback(() => {
    const tag = sp.get("tag")?.trim() || undefined;
    const onlyShipped =
      sp.get("onlyShipped") === "1" || sp.get("onlyShipped") === "true";
    const hideShipped =
      !onlyShipped &&
      (sp.get("hideShipped") === "1" || sp.get("hideShipped") === "true");
    const q = normalizeOrdersSearchQuery(sp.get("q")) || undefined;
    return {
      limit: pageSize,
      tag,
      hideShipped: hideShipped || undefined,
      onlyShipped: onlyShipped || undefined,
      q,
    };
  }, [pageSize, sp]);

  const applyActual = useCallback(() => {
    router.push(
      ordersListHref({
        ...commonHrefOpts(),
        ship: "actual",
      }),
    );
  }, [router, commonHrefOpts]);

  const applyPeriod = useCallback(() => {
    const toTrim = to.trim();
    if (!toTrim) return;
    router.push(
      ordersListHref({
        ...commonHrefOpts(),
        ship: "period",
        shipFrom: from.trim() || undefined,
        shipTo: toTrim,
      }),
    );
  }, [router, commonHrefOpts, from, to]);

  const cardClass = isHarmony
    ? "no-print flex h-full min-h-[2.75rem] min-w-0 items-center rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 card-shadow sm:px-2.5 sm:py-1.5"
    : "no-print flex h-full min-h-[2.75rem] min-w-0 items-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] sm:px-2.5 sm:py-1.5";

  const dateInp =
    "h-8 w-[6.25rem] min-w-0 max-w-full shrink-0 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-1 py-0.5 text-[11px] text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

  const actualActive = shipMode === "actual";
  const periodActive = shipMode === "period";

  const printPdfHref = useMemo(() => {
    if (shipMode === "actual") {
      return ordersShipmentListPdfHref({ ship: "actual" });
    }
    if (shipMode === "period" && appliedShipTo) {
      return ordersShipmentListPdfHref({
        ship: "period",
        shipFrom: appliedShipFrom,
        shipTo: appliedShipTo,
      });
    }
    const toTrim = to.trim();
    if (toTrim) {
      return ordersShipmentListPdfHref({
        ship: "period",
        shipFrom: from.trim() || undefined,
        shipTo: toTrim,
      });
    }
    return ordersShipmentListPdfHref({ ship: "actual" });
  }, [shipMode, appliedShipFrom, appliedShipTo, from, to]);

  const printLinkClass =
    "shrink-0 whitespace-nowrap text-[11px] font-semibold text-[var(--sidebar-blue)] underline-offset-2 hover:underline sm:text-xs";

  return (
    <div className={cardClass}>
      <div className="flex min-w-0 w-full flex-nowrap items-center gap-x-1.5 overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--text-strong)]">
          <span className="whitespace-nowrap">Запись</span>
        </div>

        <button
          type="button"
          onClick={applyActual}
          className={[
            "h-8 shrink-0 rounded-full px-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors",
            actualActive
              ? "bg-[var(--sidebar-blue)] text-white shadow-sm"
              : "border border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-strong)] hover:bg-[var(--surface-hover)]",
          ].join(" ")}
          title="Сегодня и ещё 2 рабочих дня по дате записи (МСК); выходные между ними входят"
        >
          Актуальное
        </button>

        <span className="shrink-0 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          за период
        </span>

        <label className="sr-only" htmlFor={fromId}>
          Дата с
        </label>
        <input
          id={fromId}
          type="date"
          className={dateInp}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          title="Дата записи с (необязательно)"
        />
        <label className="sr-only" htmlFor={toId}>
          Дата по
        </label>
        <input
          id={toId}
          type="date"
          className={dateInp}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          title="Дата записи по"
        />
        <button
          type="button"
          onClick={applyPeriod}
          className={[
            "h-8 shrink-0 rounded-full px-2.5 text-[11px] font-semibold text-white hover:opacity-95",
            periodActive
              ? "bg-[var(--sidebar-blue)] ring-2 ring-sky-400/60"
              : "bg-[var(--sidebar-blue)]",
          ].join(" ")}
        >
          Показать
        </button>

        {printPdfHref ? (
          <a
            href={printPdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className={printLinkClass}
          >
            Печать списка
          </a>
        ) : (
          <span className={`${printLinkClass} opacity-50`}>Печать списка</span>
        )}
      </div>
    </div>
  );
}
