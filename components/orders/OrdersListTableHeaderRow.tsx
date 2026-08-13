"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import { moscowTodayYmd } from "@/lib/shipments-date-range";

const TH =
  "min-w-0 whitespace-nowrap px-1 py-1 text-center sm:px-1.5 sm:py-1.5";

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

function FilterTh({
  label,
  title,
  active,
  open,
  onToggle,
  children,
}: {
  label: string;
  title: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  return (
    <th
      className={`${TH} relative normal-case`}
      title={title}
      aria-sort={undefined}
    >
      <button
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
      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          className="absolute left-1/2 top-full z-[80] mt-1 w-max min-w-[14rem] max-w-[min(92vw,22rem)] -translate-x-1/2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2.5 shadow-lg ring-1 ring-black/10 dark:ring-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      ) : null}
    </th>
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

  const applyLab = () => {
    router.push(
      ordersListHref({
        ...commonHref(),
        from: labFrom.trim() || undefined,
        to: labTo.trim() || undefined,
        ...pickOrdersShipmentHrefOpts(sp),
        ...pickOrdersOtprHrefOpts(sp),
      }),
    );
    setOpen(null);
  };

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

  return (
    <tr
      ref={rowRef}
      className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-[9px] font-semibold uppercase leading-snug tracking-wide text-[var(--text-secondary)] sm:text-[10px] md:text-xs"
    >
      <th
        className={`${TH} max-md:hidden normal-case`}
        title="Чат карточки в Kaiten"
      >
        Чат
      </th>
      <th
        className={`${TH} max-md:hidden normal-case`}
        aria-label={
          isDemo
            ? "Печать наряда, этикетки и QR на карточку канбана"
            : "Печать наряда, этикетки и QR на карточку Kaiten"
        }
        title={
          isDemo
            ? "Печать наряда, этикетки и QR на карточку канбана"
            : "Печать наряда, этикетки и QR на карточку Kaiten"
        }
      >
        Печать
      </th>
      <th
        className={TH}
        title={
          isDemo
            ? "Статус карточки в канбане"
            : "Статус карточки в Kaiten / канбане"
        }
      >
        Статус
      </th>
      <th className={TH} title="№ наряда">
        № наряда
      </th>
      <th className={TH} title="Пациент">
        Пациент
      </th>
      <th className={TH} title="Врач">
        Врач
      </th>
      <th className={TH} title="Клиника">
        Клиника
      </th>
      <th className={TH} title="Адрес клиники">
        Адрес
      </th>
      <th
        className={TH}
        title="Поступление: когда работа зашла в лабораторию (без даты — дата занесения наряда)"
      >
        Поступление
      </th>

      <FilterTh
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
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" className={showBtn} onClick={applyLab}>
              Показать
            </button>
            {labActive ? (
              <button
                type="button"
                className="h-8 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 text-[11px] font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
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

      <th
        className={`${TH} max-md:hidden normal-case`}
        title="Пометки смен (не уходят в наряд и Kaiten)"
      >
        Пометки
      </th>

      <FilterTh
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

      <th
        className={`${TH} align-top normal-case`}
        title="Теги: нажмите — фильтр списка; «+» — добавить свой тег к наряду"
      >
        Отметки
      </th>
    </tr>
  );
}
