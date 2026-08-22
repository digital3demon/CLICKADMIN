"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ordersListPeriodDefaultDraft } from "@/lib/orders-list-period";
import {
  normalizeOrdersSearchQuery,
  ordersListHref,
  pickOrdersOtprHrefOpts,
} from "@/lib/orders-list-query";
import {
  ordersShipmentListPdfHref,
  pickOrdersShipmentHrefOpts,
} from "@/lib/orders-shipment-list-query";
import { moscowTodayYmd, moscowTomorrowYmd } from "@/lib/shipments-date-range";
import { OrdersListColHeader } from "@/components/orders/OrdersListColHeader";
import { useOrdersListColCollapse } from "@/components/orders/OrdersListColumnsProvider";
import type { OrdersListColId } from "@/lib/orders-list-collapsed-cols";

type OpenKey = "lab" | "appt" | "otpr" | null;

type Props = {
  isDemo: boolean;
  pageSize: number;
  appliedFrom: string | null;
  appliedTo: string | null;
  shipMode: "actual" | "period" | null;
  appliedShipFrom: string | null;
  appliedShipTo: string | null;
  appliedOtprFrom: string | null;
  appliedOtprTo: string | null;
};

function useCommonHrefOpts(pageSize: number) {
  const sp = useSearchParams();
  return useCallback(() => {
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
}

function DateRangeFields({
  fromId,
  toId,
  from,
  to,
  onFrom,
  onTo,
  fromTitle,
  toTitle,
}: {
  fromId: string;
  toId: string;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  fromTitle: string;
  toTitle: string;
}) {
  const dateInp =
    "h-8 w-[7.25rem] min-w-0 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-1 py-0.5 text-[11px] text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";
  const labelClass =
    "whitespace-nowrap text-[9px] font-medium lowercase text-[var(--text-secondary)]";
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <div className="flex items-center gap-0.5">
        <label htmlFor={fromId} className={labelClass} title={fromTitle}>
          с (вкл)
        </label>
        <input
          id={fromId}
          type="date"
          className={dateInp}
          value={from}
          onChange={(e) => onFrom(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-0.5">
        <label htmlFor={toId} className={labelClass} title={toTitle}>
          по (вкл)
        </label>
        <input
          id={toId}
          type="date"
          className={dateInp}
          value={to}
          onChange={(e) => onTo(e.target.value)}
        />
      </div>
    </div>
  );
}

/**
 * Панель в portal + fixed: sticky thead с overflow-x/y иначе обрезает absolute-dropdown.
 */
function FilterTh({
  col,
  label,
  title,
  active,
  open,
  onToggle,
  children,
}: {
  col: OrdersListColId;
  label: string;
  title: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { isCollapsed } = useOrdersListColCollapse();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const update = () => {
      const el = buttonRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const left = Math.min(
        Math.max(r.left + r.width / 2, 140),
        window.innerWidth - 140,
      );
      setCoords({ top: r.bottom + 4, left });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  return (
    <OrdersListColHeader col={col} title={title} className="normal-case">
      <button
        ref={buttonRef}
        type="button"
        className={[
          "inline-flex max-w-full items-center justify-center gap-0.5 rounded px-0.5 py-0.5 text-[9px] font-semibold uppercase leading-snug tracking-wide hover:bg-[var(--table-row-hover)] sm:text-[10px] md:text-xs",
          active || open
            ? "text-[var(--sidebar-blue)]"
            : "text-[var(--text-secondary)]",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <span className="truncate">{label}</span>
        <span
          aria-hidden
          className={`text-[0.65em] transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {mounted && open && coords && !isCollapsed(col)
        ? createPortal(
            <div
              data-orders-col-filter-panel=""
              role="dialog"
              style={{ top: coords.top, left: coords.left }}
              className="fixed z-[300] w-max min-w-[14rem] max-w-[min(92vw,22rem)] -translate-x-1/2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2.5 shadow-lg ring-1 ring-black/10 dark:ring-white/10"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </OrdersListColHeader>
  );
}

export function OrdersListTableHeaderRow({
  isDemo,
  pageSize,
  appliedFrom,
  appliedTo,
  shipMode,
  appliedShipFrom,
  appliedShipTo,
  appliedOtprFrom,
  appliedOtprTo,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const commonHref = useCommonHrefOpts(pageSize);
  const uid = useId();
  const [open, setOpen] = useState<OpenKey>(null);
  const rowRef = useRef<HTMLTableRowElement>(null);

  const defaultDraft = useMemo(() => ordersListPeriodDefaultDraft(), []);
  const [labFrom, setLabFrom] = useState(
    () => appliedFrom ?? defaultDraft.from,
  );
  const [labTo, setLabTo] = useState(() => appliedTo ?? defaultDraft.to);
  const [apptFrom, setApptFrom] = useState(
    () => appliedShipFrom ?? defaultDraft.from,
  );
  const [apptTo, setApptTo] = useState(
    () => appliedShipTo ?? moscowTodayYmd(),
  );
  const [otprFrom, setOtprFrom] = useState(
    () => appliedOtprFrom ?? defaultDraft.from,
  );
  const [otprTo, setOtprTo] = useState(
    () => appliedOtprTo ?? defaultDraft.to,
  );

  useEffect(() => {
    setLabFrom(appliedFrom ?? defaultDraft.from);
    setLabTo(appliedTo ?? defaultDraft.to);
  }, [appliedFrom, appliedTo, defaultDraft.from, defaultDraft.to]);

  useEffect(() => {
    setApptFrom(appliedShipFrom ?? defaultDraft.from);
    setApptTo(appliedShipTo ?? moscowTodayYmd());
  }, [appliedShipFrom, appliedShipTo, defaultDraft.from]);

  useEffect(() => {
    setOtprFrom(appliedOtprFrom ?? defaultDraft.from);
    setOtprTo(appliedOtprTo ?? defaultDraft.to);
  }, [appliedOtprFrom, appliedOtprTo, defaultDraft.from, defaultDraft.to]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (rowRef.current?.contains(t)) return;
      if (
        t instanceof Element &&
        t.closest("[data-orders-col-filter-panel]")
      ) {
        return;
      }
      setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const labActive = Boolean(appliedFrom?.trim() || appliedTo?.trim());
  const apptActive = shipMode != null;
  const otprActive = Boolean(
    appliedOtprFrom?.trim() || appliedOtprTo?.trim(),
  );

  const applyLabRange = (fromYmd: string, toYmd: string) => {
    const from = fromYmd.trim();
    const to = toYmd.trim();
    setLabFrom(from);
    setLabTo(to);
    router.push(
      ordersListHref({
        ...commonHref(),
        from: from || undefined,
        to: to || undefined,
        ...pickOrdersShipmentHrefOpts(sp),
        ...pickOrdersOtprHrefOpts(sp),
      }),
    );
    setOpen(null);
  };

  const applyLab = () => applyLabRange(labFrom, labTo);

  const todayYmd = moscowTodayYmd();
  const tomorrowYmd = moscowTomorrowYmd();
  const labAppliedFrom = (appliedFrom ?? "").trim();
  const labAppliedTo = (appliedTo ?? "").trim();
  const labIsToday =
    labAppliedFrom === todayYmd &&
    (labAppliedTo === todayYmd || (!labAppliedTo && labAppliedFrom === todayYmd));
  const labIsTomorrow =
    labAppliedFrom === tomorrowYmd &&
    (labAppliedTo === tomorrowYmd ||
      (!labAppliedTo && labAppliedFrom === tomorrowYmd));

  const applyApptActual = () => {
    router.push(
      ordersListHref({
        ...commonHref(),
        from: undefined,
        to: undefined,
        ship: "actual",
        ...pickOrdersOtprHrefOpts(sp),
      }),
    );
    setOpen(null);
  };

  const applyApptPeriod = () => {
    const toTrim = apptTo.trim();
    if (!toTrim) return;
    router.push(
      ordersListHref({
        ...commonHref(),
        from: undefined,
        to: undefined,
        ship: "period",
        shipFrom: apptFrom.trim() || undefined,
        shipTo: toTrim,
        ...pickOrdersOtprHrefOpts(sp),
      }),
    );
    setOpen(null);
  };

  const applyOtpr = () => {
    router.push(
      ordersListHref({
        ...commonHref(),
        from: labActive ? appliedFrom ?? undefined : undefined,
        to: labActive ? appliedTo ?? undefined : undefined,
        ...pickOrdersShipmentHrefOpts(sp),
        otprFrom: otprFrom.trim() || undefined,
        otprTo: otprTo.trim() || undefined,
      }),
    );
    setOpen(null);
  };

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
    const toTrim = apptTo.trim();
    if (toTrim) {
      return ordersShipmentListPdfHref({
        ship: "period",
        shipFrom: apptFrom.trim() || undefined,
        shipTo: toTrim,
      });
    }
    return ordersShipmentListPdfHref({ ship: "actual" });
  }, [shipMode, appliedShipFrom, appliedShipTo, apptFrom, apptTo]);

  const showBtn =
    "h-8 shrink-0 rounded-md bg-[var(--sidebar-blue)] px-2.5 text-[11px] font-semibold text-white hover:opacity-95";
  const dayPresetBtn = (active: boolean) =>
    [
      "h-8 shrink-0 rounded-md px-2.5 text-[11px] font-semibold",
      active
        ? "bg-[var(--sidebar-blue)] text-white"
        : "border border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-body)] hover:bg-[var(--surface-hover)]",
    ].join(" ");

  return (
    <tr
      ref={rowRef}
      className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-[9px] font-semibold uppercase leading-snug tracking-wide text-[var(--text-secondary)] sm:text-[10px] md:text-xs"
    >
      <OrdersListColHeader
        col="chat"
        title="Чат карточки в Kaiten"
        className="max-md:hidden normal-case"
      >
        Чат
      </OrdersListColHeader>
      <OrdersListColHeader
        col="print"
        title={
          isDemo
            ? "Печать наряда, этикетки и QR на карточку канбана"
            : "Печать наряда, этикетки и QR на карточку Kaiten"
        }
        className="max-md:hidden normal-case"
      >
        Печать
      </OrdersListColHeader>
      <OrdersListColHeader
        col="status"
        title={
          isDemo
            ? "Статус карточки в канбане"
            : "Статус карточки в Kaiten / канбане"
        }
      >
        Статус
      </OrdersListColHeader>
      <OrdersListColHeader col="type" title="Тип карточки канбана">
        Тип
      </OrdersListColHeader>
      <OrdersListColHeader col="number" title="№ наряда">
        № наряда
      </OrdersListColHeader>
      <OrdersListColHeader col="patient" title="Пациент">
        Пациент
      </OrdersListColHeader>
      <OrdersListColHeader col="doctor" title="Врач">
        Врач
      </OrdersListColHeader>
      <OrdersListColHeader col="clinic" title="Клиника">
        Клиника
      </OrdersListColHeader>
      <OrdersListColHeader col="address" title="Адрес клиники">
        Адрес
      </OrdersListColHeader>
      <OrdersListColHeader
        col="admission"
        title="Поступление: когда работа зашла в лабораторию (без даты — дата занесения наряда)"
      >
        Постп
      </OrdersListColHeader>

      <FilterTh
        col="lab"
        label="ЛАБ"
        title="Срок лабораторный — фильтр с/по"
        active={labActive}
        open={open === "lab"}
        onToggle={() => setOpen((k) => (k === "lab" ? null : "lab"))}
      >
        <div className="flex flex-col gap-2">
          <DateRangeFields
            fromId={`${uid}-lab-from`}
            toId={`${uid}-lab-to`}
            from={labFrom}
            to={labTo}
            onFrom={setLabFrom}
            onTo={setLabTo}
            fromTitle="Лабораторный срок с (МСК), включительно"
            toTitle="Лабораторный срок по (МСК), включительно"
          />
          <div className="flex flex-nowrap items-center gap-1.5">
            <button
              type="button"
              className={dayPresetBtn(labIsToday)}
              title="Лабораторный срок — сегодня (МСК)"
              onClick={() => applyLabRange(todayYmd, todayYmd)}
            >
              Сегодня
            </button>
            <button
              type="button"
              className={dayPresetBtn(labIsTomorrow)}
              title="Лабораторный срок — завтра (МСК)"
              onClick={() => applyLabRange(tomorrowYmd, tomorrowYmd)}
            >
              Завтра
            </button>
            <button type="button" className={showBtn} onClick={applyLab}>
              Показать
            </button>
            {labActive ? (
              <button
                type="button"
                className="h-8 shrink-0 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 text-[11px] font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                onClick={() => {
                  router.push(
                    ordersListHref({
                      ...commonHref(),
                      ...pickOrdersShipmentHrefOpts(sp),
                      ...pickOrdersOtprHrefOpts(sp),
                    }),
                  );
                  setOpen(null);
                }}
              >
                Сбросить
              </button>
            ) : null}
          </div>
        </div>
      </FilterTh>

      <FilterTh
        col="appointment"
        label="Запись"
        title="Запись: актуальное или период + печать списка"
        active={apptActive}
        open={open === "appt"}
        onToggle={() => setOpen((k) => (k === "appt" ? null : "appt"))}
      >
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={applyApptActual}
            className={[
              "h-8 w-fit rounded-full px-2.5 text-[11px] font-bold uppercase tracking-wide",
              shipMode === "actual"
                ? "bg-[var(--sidebar-blue)] text-white shadow-sm"
                : "border border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-strong)] hover:bg-[var(--surface-hover)]",
            ].join(" ")}
            title="Сегодня и ещё 2 рабочих дня по дате записи (МСК)"
          >
            Актуальное
          </button>
          <DateRangeFields
            fromId={`${uid}-appt-from`}
            toId={`${uid}-appt-to`}
            from={apptFrom}
            to={apptTo}
            onFrom={setApptFrom}
            onTo={setApptTo}
            fromTitle="Дата записи с (необязательно)"
            toTitle="Дата записи по"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" className={showBtn} onClick={applyApptPeriod}>
              Показать
            </button>
            {printPdfHref ? (
              <Link
                href={printPdfHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-[var(--sidebar-blue)] underline-offset-2 hover:underline"
              >
                Печать списка
              </Link>
            ) : null}
            {apptActive ? (
              <button
                type="button"
                className="h-8 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 text-[11px] font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                onClick={() => {
                  router.push(
                    ordersListHref({
                      ...commonHref(),
                      from: labActive ? appliedFrom ?? undefined : undefined,
                      to: labActive ? appliedTo ?? undefined : undefined,
                      ...pickOrdersOtprHrefOpts(sp),
                    }),
                  );
                  setOpen(null);
                }}
              >
                Сбросить
              </button>
            ) : null}
          </div>
        </div>
      </FilterTh>

      <OrdersListColHeader
        col="memoAdmin"
        title="ПА — пометки админов (не уходят в наряд и Kaiten)"
        className="w-[4.25rem] max-w-[4.25rem] px-1 max-md:hidden normal-case"
      >
        ПА
      </OrdersListColHeader>
      <OrdersListColHeader
        col="memoTech"
        title="ПТ — пометки техники (не уходят в наряд и Kaiten)"
        className="w-[4.25rem] max-w-[4.25rem] px-1 max-md:hidden normal-case"
      >
        ПТ
      </OrdersListColHeader>

      <FilterTh
        col="shipped"
        label="Отправка"
        title="Отправка работы — фильтр по дате отправки с/по"
        active={otprActive}
        open={open === "otpr"}
        onToggle={() => setOpen((k) => (k === "otpr" ? null : "otpr"))}
      >
        <div className="flex flex-col gap-2">
          <DateRangeFields
            fromId={`${uid}-otpr-from`}
            toId={`${uid}-otpr-to`}
            from={otprFrom}
            to={otprTo}
            onFrom={setOtprFrom}
            onTo={setOtprTo}
            fromTitle="Дата отправки с (МСК), включительно"
            toTitle="Дата отправки по (МСК), включительно"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" className={showBtn} onClick={applyOtpr}>
              Показать
            </button>
            {otprActive ? (
              <button
                type="button"
                className="h-8 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 text-[11px] font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                onClick={() => {
                  router.push(
                    ordersListHref({
                      ...commonHref(),
                      from: labActive ? appliedFrom ?? undefined : undefined,
                      to: labActive ? appliedTo ?? undefined : undefined,
                      ...pickOrdersShipmentHrefOpts(sp),
                    }),
                  );
                  setOpen(null);
                }}
              >
                Сбросить
              </button>
            ) : null}
          </div>
        </div>
      </FilterTh>

      <OrdersListColHeader
        col="tags"
        title="Теги: нажмите — фильтр списка; «+» — добавить свой тег к наряду"
        className="align-top normal-case"
      >
        Отметки
      </OrdersListColHeader>
    </tr>
  );
}
