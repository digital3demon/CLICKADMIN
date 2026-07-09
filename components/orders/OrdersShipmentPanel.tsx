"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import {
  ordersListPeriodDefaultDraft,
} from "@/lib/orders-list-period";
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
    ? "no-print flex min-w-0 flex-col gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 card-shadow"
    : "no-print flex min-w-0 flex-col gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]";

  const dateInp =
    "h-9 min-w-0 flex-1 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-sm text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-[10rem] sm:flex-none";

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

  const printBtnClass = isHarmony
    ? "w-full rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-hover)]"
    : "w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-strong)] shadow-sm transition-colors hover:bg-[var(--table-row-hover)]";

  return (
    <div className={cardClass}>
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-strong)]">
        <span aria-hidden className="text-base">
          📦
        </span>
        <span>Отгрузки</span>
      </div>

      <button
        type="button"
        onClick={applyActual}
        className={[
          "w-full rounded-md px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors",
          actualActive
            ? "bg-[var(--sidebar-blue)] text-white shadow-sm"
            : "border border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-strong)] hover:bg-[var(--surface-hover)]",
        ].join(" ")}
      >
        Актуальные
      </button>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          за период
        </span>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
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
              "h-9 shrink-0 rounded-md px-4 text-sm font-semibold text-white hover:opacity-95",
              periodActive
                ? "bg-[var(--sidebar-blue)] ring-2 ring-sky-400/60"
                : "bg-[var(--sidebar-blue)]",
            ].join(" ")}
          >
            Показать
          </button>
        </div>
      </div>

      {printPdfHref ? (
        <a
          href={printPdfHref}
          target="_blank"
          rel="noopener noreferrer"
          className={printBtnClass}
        >
          Печать списка
        </a>
      ) : (
        <button type="button" disabled className={`${printBtnClass} opacity-50`}>
          Печать списка
        </button>
      )}
    </div>
  );
}
