"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { financeOfficeListHref } from "@/lib/finance-office-list-query";
import type { OrdersShipmentMode } from "@/lib/orders-shipment-list-query";
import {
  moscowTodayYmd,
  moscowTomorrowYmd,
} from "@/lib/shipments-date-range";

type OpenKey = "inv" | "lab" | "appt" | null;

type Ctx = {
  tab: string;
  tag?: string | null;
  q?: string | null;
};

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
    <th className="min-w-0 px-2 py-2 text-center normal-case" title={title}>
      <button
        ref={buttonRef}
        type="button"
        className={[
          "inline-flex max-w-full items-center justify-center gap-0.5 rounded px-0.5 py-0.5 text-[11px] font-semibold uppercase leading-snug tracking-wide hover:bg-[var(--table-row-hover)]",
          active || open
            ? "text-[var(--sidebar-blue)]"
            : "text-[var(--text-secondary)]",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-fo-date-filter-trigger
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
      {mounted && open && coords
        ? createPortal(
            <div
              data-fo-date-filter-panel
              className="fixed z-[80] w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2.5 shadow-lg"
              style={{ top: coords.top, left: coords.left }}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </th>
  );
}

export function FinanceOfficeDateFilterHeaders({
  appliedFrom,
  appliedTo,
  shipMode,
  appliedShipFrom,
  appliedShipTo,
  appliedInvFrom,
  appliedInvTo,
  ctx,
}: {
  appliedFrom: string | null;
  appliedTo: string | null;
  shipMode: OrdersShipmentMode | null;
  appliedShipFrom: string | null;
  appliedShipTo: string | null;
  appliedInvFrom: string | null;
  appliedInvTo: string | null;
  ctx: Ctx;
}) {
  const router = useRouter();
  const uid = useId();
  const [open, setOpen] = useState<OpenKey>(null);
  const [labFrom, setLabFrom] = useState(appliedFrom ?? "");
  const [labTo, setLabTo] = useState(appliedTo ?? "");
  const [apptFrom, setApptFrom] = useState(appliedShipFrom ?? "");
  const [apptTo, setApptTo] = useState(appliedShipTo ?? "");
  const [invFrom, setInvFrom] = useState(appliedInvFrom ?? "");
  const [invTo, setInvTo] = useState(appliedInvTo ?? "");

  useEffect(() => {
    setLabFrom(appliedFrom ?? "");
    setLabTo(appliedTo ?? "");
  }, [appliedFrom, appliedTo]);

  useEffect(() => {
    setApptFrom(appliedShipFrom ?? "");
    setApptTo(appliedShipTo ?? "");
  }, [appliedShipFrom, appliedShipTo]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (
        t instanceof Element &&
        (t.closest("[data-fo-date-filter-panel]") ||
          t.closest("[data-fo-date-filter-trigger]"))
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

  const invActive = Boolean(appliedInvTo?.trim());
  const labActive = Boolean(appliedFrom?.trim() || appliedTo?.trim());
  const apptActive = shipMode != null && !invActive;
  const labHeaderActive = labActive && !apptActive && !invActive;
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
  const invAppliedFrom = (appliedInvFrom ?? "").trim();
  const invAppliedTo = (appliedInvTo ?? "").trim();
  const invIsToday =
    invAppliedFrom === todayYmd && invAppliedTo === todayYmd;
  const invIsTomorrow =
    invAppliedFrom === tomorrowYmd && invAppliedTo === tomorrowYmd;

  const showBtn =
    "h-8 shrink-0 rounded-md bg-[var(--sidebar-blue)] px-2.5 text-[11px] font-semibold text-white hover:opacity-95";
  const dayPresetBtn = (active: boolean) =>
    [
      "h-8 shrink-0 rounded-md px-2.5 text-[11px] font-semibold",
      active
        ? "bg-[var(--sidebar-blue)] text-white"
        : "border border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-body)] hover:bg-[var(--surface-hover)]",
    ].join(" ");

  const applyLabRange = (fromYmd: string, toYmd: string) => {
    const from = fromYmd.trim();
    const to = toYmd.trim();
    setLabFrom(from);
    setLabTo(to);
    router.push(
      financeOfficeListHref({
        tab: "period",
        from: from || undefined,
        to: to || undefined,
        tag: ctx.tag,
        q: ctx.q,
      }),
    );
    setOpen(null);
  };

  const applyInvRange = (fromYmd: string, toYmd: string) => {
    const from = fromYmd.trim();
    const to = toYmd.trim();
    if (!to) return;
    setInvFrom(from);
    setInvTo(to);
    router.push(
      financeOfficeListHref({
        tab: ctx.tab,
        tag: ctx.tag,
        q: ctx.q,
        invFrom: from || undefined,
        invTo: to,
      }),
    );
    setOpen(null);
  };

  return (
    <>
      <FilterTh
        label="Счёт выставлен"
        title="Дата выставления счёта — фильтр с/по (дата, без времени)"
        active={invActive}
        open={open === "inv"}
        onToggle={() => setOpen((k) => (k === "inv" ? null : "inv"))}
      >
        <div className="flex flex-col gap-2">
          <DateRangeFields
            fromId={`${uid}-inv-from`}
            toId={`${uid}-inv-to`}
            from={invFrom}
            to={invTo}
            onFrom={setInvFrom}
            onTo={setInvTo}
            fromTitle="Счёт выставлен с (МСК), включительно"
            toTitle="Счёт выставлен по (МСК), включительно"
          />
          <div className="flex flex-nowrap items-center gap-1.5">
            <button
              type="button"
              className={dayPresetBtn(invIsToday && invActive)}
              onClick={() => applyInvRange(todayYmd, todayYmd)}
            >
              Сегодня
            </button>
            <button
              type="button"
              className={dayPresetBtn(invIsTomorrow && invActive)}
              onClick={() => applyInvRange(tomorrowYmd, tomorrowYmd)}
            >
              Завтра
            </button>
            <button
              type="button"
              className={showBtn}
              onClick={() => applyInvRange(invFrom, invTo)}
            >
              Показать
            </button>
            {invActive ? (
              <button
                type="button"
                className="h-8 shrink-0 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 text-[11px] font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                onClick={() => {
                  router.push(
                    financeOfficeListHref({
                      tab: ctx.tab,
                      from: appliedFrom,
                      to: appliedTo,
                      tag: ctx.tag,
                      q: ctx.q,
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
        label="Лаб срок"
        title="Срок лабораторный — фильтр с/по (дата, без времени)"
        active={labHeaderActive}
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
              className={dayPresetBtn(labIsToday && labHeaderActive)}
              onClick={() => applyLabRange(todayYmd, todayYmd)}
            >
              Сегодня
            </button>
            <button
              type="button"
              className={dayPresetBtn(labIsTomorrow && labHeaderActive)}
              onClick={() => applyLabRange(tomorrowYmd, tomorrowYmd)}
            >
              Завтра
            </button>
            <button
              type="button"
              className={showBtn}
              onClick={() => applyLabRange(labFrom, labTo)}
            >
              Показать
            </button>
            {labHeaderActive ? (
              <button
                type="button"
                className="h-8 shrink-0 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 text-[11px] font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                onClick={() => {
                  router.push(
                    financeOfficeListHref({
                      tab: "actual",
                      tag: ctx.tag,
                      q: ctx.q,
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
        title="Дата записи пациента — актуальное или период (без времени)"
        active={apptActive}
        open={open === "appt"}
        onToggle={() => setOpen((k) => (k === "appt" ? null : "appt"))}
      >
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              router.push(
                financeOfficeListHref({
                  tab: ctx.tab,
                  tag: ctx.tag,
                  q: ctx.q,
                  ship: "actual",
                }),
              );
              setOpen(null);
            }}
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
            <button
              type="button"
              className={showBtn}
              onClick={() => {
                const toTrim = apptTo.trim();
                if (!toTrim) return;
                router.push(
                  financeOfficeListHref({
                    tab: ctx.tab,
                    tag: ctx.tag,
                    q: ctx.q,
                    ship: "period",
                    shipFrom: apptFrom.trim() || undefined,
                    shipTo: toTrim,
                  }),
                );
                setOpen(null);
              }}
            >
              Показать
            </button>
            {apptActive ? (
              <button
                type="button"
                className="h-8 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 text-[11px] font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                onClick={() => {
                  router.push(
                    financeOfficeListHref({
                      tab: ctx.tab,
                      from: appliedFrom,
                      to: appliedTo,
                      tag: ctx.tag,
                      q: ctx.q,
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
    </>
  );
}
