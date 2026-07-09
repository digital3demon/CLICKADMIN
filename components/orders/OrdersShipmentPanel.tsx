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
};

/**
 * Макет: одна плотная строка — Отгрузки · Актуальные · за период · даты · Показать · Печать.
 * Высота как у полосы пилюль.
 */
export function OrdersShipmentPanel({
  pageSize,
  appliedShipFrom,
  appliedShipTo,
  shipMode,
}: Props) {
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
    ? "no-print flex h-full min-h-[3.25rem] min-w-0 items-center rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1.5 card-shadow sm:px-3 sm:py-2"
    : "no-print flex h-full min-h-[3.25rem] min-w-0 items-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1.5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] sm:px-3 sm:py-2";

  const dateInp =
    "h-8 w-[6.75rem] min-w-0 max-w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-1 py-0.5 text-[11px] text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:h-9 sm:w-[7.5rem] sm:text-xs";

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
      {/* Без горизонтального скролла: даты уже узкие, при нехватке места — wrap. */}
      <div className="flex min-w-0 w-full flex-wrap items-center gap-x-1.5 gap-y-1.5">
        <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--text-strong)] sm:text-sm">
          <span aria-hidden className="text-sm leading-none sm:text-base">
            📦
          </span>
          <span className="whitespace-nowrap">Отгрузки</span>
        </div>

        <button
          type="button"
          onClick={applyActual}
          className={[
            "h-8 shrink-0 rounded-md px-2 text-[11px] font-bold uppercase tracking-wide transition-colors sm:h-9 sm:px-2.5 sm:text-xs",
            actualActive
              ? "bg-[var(--sidebar-blue)] text-white shadow-sm"
              : "border border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-strong)] hover:bg-[var(--surface-hover)]",
          ].join(" ")}
        >
          Актуальные
        </button>

        <span className="shrink-0 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] sm:text-[10px]">
          за период
        </span>

        <label className="sr-only" htmlFor="orders-ship-from">
          Дата с
        </label>
        <input
          id="orders-ship-from"
          type="date"
          className={dateInp}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          title="Дата записи с (необязательно)"
        />
        <label className="sr-only" htmlFor="orders-ship-to">
          Дата по
        </label>
        <input
          id="orders-ship-to"
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
            "h-8 shrink-0 rounded-md px-2 text-[11px] font-semibold text-white hover:opacity-95 sm:h-9 sm:px-2.5 sm:text-xs",
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
