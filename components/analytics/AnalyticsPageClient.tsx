"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  currentMskMonthYmdRange,
  defaultAnalyticsRange,
  toYmd,
} from "@/lib/analytics/range";
import type { ContractorsLifecycleReport } from "@/lib/analytics/clients-lifecycle";
import { emptyContractorsLifecycle } from "@/lib/analytics/clients-lifecycle";
import { AnalyticsDeadlinesPanel } from "@/components/analytics/AnalyticsDeadlinesPanel";
import { AnalyticsCompareModal } from "@/components/analytics/AnalyticsCompareModal";
import { AnalyticsContractorsLifecyclePanel } from "@/components/analytics/AnalyticsContractorsLifecyclePanel";

const TABS = [
  { id: "finance" as const, label: "Финансы" },
  { id: "rework" as const, label: "Переделки" },
  { id: "production" as const, label: "Производство" },
  { id: "price" as const, label: "Позиции прайса" },
  { id: "contractors" as const, label: "Клиники и врачи" },
  { id: "warehouse" as const, label: "Склад" },
  { id: "deadlines" as const, label: "Сроки" },
  { id: "reconciliation" as const, label: "Сверки" },
];

function moneyRub(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

const CHART_COLORS = {
  primary: "#0ea5e9",
  secondary: "#8b5cf6",
  muted: "#64748b",
};

type TabId = (typeof TABS)[number]["id"];

function monthNameRu(month: number): string {
  const d = new Date(Date.UTC(2026, Math.max(0, Math.min(11, month - 1)), 1));
  return d.toLocaleString("ru-RU", { month: "long" });
}

function formatMonthTitle(year: number, month: number): string {
  return `${monthNameRu(month)} ${year}`;
}

export function AnalyticsPageClient() {
  const initial = useMemo(() => defaultAnalyticsRange(), []);
  const [fromStr, setFromStr] = useState(() => toYmd(initial.from));
  const [toStr, setToStr] = useState(() => toYmd(initial.to));
  const [tab, setTab] = useState<TabId>("finance");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const loadedForQRef = useRef<Partial<Record<TabId, string>>>({});

  const [finance, setFinance] = useState<{
    totals: {
      revenue: number;
      actualRevenue: number;
      orders: number;
      cancelled: number;
      avgCheck: number;
      correctionOrders: number;
      correctionRevenue: number;
      reworkOrders: number;
      reworkRevenue: number;
    };
    privateClients: {
      revenue: number;
      actualRevenue: number;
      orders: number;
      avgCheck: number;
    };
    series: { date: string; revenue: number; actualRevenue: number; orders: number }[];
    reworkTopItems: {
      code: string;
      name: string;
      reworkOrders: number;
      lineCount: number;
      quantity: number;
    }[];
    correctionDetail?: {
      byTrack: {
        track: string;
        label: string;
        orders: number;
        revenue: number;
      }[];
      paidVsFree: {
        paid: { orders: number; revenue: number };
        free: { orders: number; revenue: number };
      };
    };
  } | null>(null);

  const [price, setPrice] = useState<{
    rows: {
      priceListItemId: string;
      code: string;
      name: string;
      orderCount: number;
      lineCount: number;
      revenue: number;
    }[];
  } | null>(null);

  const [contractors, setContractors] = useState<{
    clinics: {
      clinicName: string;
      orderCount: number;
      revenue: number;
      ordersPerMonth: number;
    }[];
    doctors: {
      doctorName: string;
      orderCount: number;
      revenue: number;
      ordersPerMonth: number;
    }[];
    lifecycle?: ContractorsLifecycleReport;
  } | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const contractorsMonthAppliedRef = useRef(false);

  const [warehouse, setWarehouse] = useState<{
    movementCount: number;
    byKind: {
      label: string;
      count: number;
      quantityAbs: number;
      totalCostRub: number;
    }[];
    topItems: {
      itemId: string;
      name: string;
      unit: string;
      movements: number;
      quantityAbs: number;
      costRub: number;
    }[];
  } | null>(null);
  const [production, setProduction] = useState<{
    totals: {
      reworkEvents: number;
      reworkedObjects: number;
      reworkedCards: number;
    };
    byBoard: {
      boardId: string;
      boardTitle: string;
      reworkEvents: number;
    }[];
    topItems: {
      boardId: string;
      boardTitle: string;
      cardId: string;
      cardTitle: string;
      laneId: string;
      objectText: string;
      sourceFileName: string;
      reworkEvents: number;
    }[];
  } | null>(null);

  const now = useMemo(() => new Date(), []);
  const [reconYear, setReconYear] = useState<number>(now.getUTCFullYear());
  const [reconMonth, setReconMonth] = useState<number>(now.getUTCMonth() + 1);
  const [reconCompareYear, setReconCompareYear] = useState<number>(
    now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear(),
  );
  const [reconCompareMonth, setReconCompareMonth] = useState<number>(
    now.getUTCMonth() === 0 ? 12 : now.getUTCMonth(),
  );
  const [reconUseCompare, setReconUseCompare] = useState(true);
  const [reconciliation, setReconciliation] = useState<{
    month: { year: number; month: number };
    compareMonth: { year: number; month: number } | null;
    rows: {
      clinicId: string;
      contractorName: string;
      monthTotalRub: number;
      compareTotalRub: number | null;
      deltaRub: number | null;
      deltaPercent: number | null;
      periods: {
        snapshotId: string;
        slot: string;
        periodLabelRu: string;
        periodFromStr: string;
        periodToStr: string;
        amountRub: number;
      }[];
      comparePeriods: {
        snapshotId: string;
        slot: string;
        periodLabelRu: string;
        periodFromStr: string;
        periodToStr: string;
        amountRub: number;
      }[];
    }[];
    totals: {
      monthTotalRub: number;
      compareTotalRub: number | null;
      deltaRub: number | null;
      deltaPercent: number | null;
    };
  } | null>(null);

  const q = useMemo(
    () =>
      `from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`,
    [fromStr, toStr],
  );
  const reconQ = useMemo(() => {
    const p = new URLSearchParams();
    p.set("year", String(reconYear));
    p.set("month", String(reconMonth));
    if (reconUseCompare) {
      p.set("compareYear", String(reconCompareYear));
      p.set("compareMonth", String(reconCompareMonth));
    }
    return p.toString();
  }, [
    reconYear,
    reconMonth,
    reconUseCompare,
    reconCompareYear,
    reconCompareMonth,
  ]);
  const activeQ = tab === "reconciliation" ? reconQ : q;

  const refetchActiveTab = useCallback(() => {
    delete loadedForQRef.current[tab];
    setReloadTick((t) => t + 1);
  }, [tab]);

  useEffect(() => {
    loadedForQRef.current = {};
    setFinance(null);
    setPrice(null);
    setContractors(null);
    setWarehouse(null);
    setProduction(null);
    setReconciliation(null);
    setError(null);
  }, [q, reconQ]);

  useEffect(() => {
    if (tab === "deadlines") return;
    if (tab === "contractors" && !contractorsMonthAppliedRef.current) {
      contractorsMonthAppliedRef.current = true;
      const month = currentMskMonthYmdRange();
      if (fromStr !== month.from || toStr !== month.to) {
        setFromStr(month.from);
        setToStr(month.to);
        return;
      }
    }
    if (loadedForQRef.current[tab] === activeQ) return;
    const ac = new AbortController();
    const tabNow = tab;
    (async () => {
      setLoading(true);
      setError(null);
      const path =
        tabNow === "finance"
          ? `/api/analytics/finance?${q}`
          : tabNow === "rework"
            ? `/api/analytics/finance?${q}`
          : tabNow === "price"
            ? `/api/analytics/price-items?${q}`
            : tabNow === "contractors"
              ? `/api/analytics/contractors?${q}`
              : tabNow === "warehouse"
                ? `/api/analytics/warehouse?${q}`
                : tabNow === "production"
                  ? `/api/analytics/production?${q}`
                : `/api/analytics/reconciliation?${reconQ}`;
      try {
        const res = await fetch(path, { signal: ac.signal });
        const text = await res.text();
        if (ac.signal.aborted) return;
        let j: unknown;
        const trimmed = text.trim();
        if (!trimmed) {
          if (!res.ok) {
            throw new Error(`Ошибка ${res.status} (пустой ответ)`);
          }
          throw new Error(
            "Пустой ответ сервера. Обновите страницу или проверьте логи приложения.",
          );
        }
        try {
          j = JSON.parse(trimmed) as unknown;
        } catch {
          throw new Error(
            res.ok
              ? "Неверный ответ сервера (не JSON). Обновите страницу."
              : `Ошибка ${res.status}: ответ не JSON`,
          );
        }
        if (!res.ok) {
          const err =
            typeof j === "object" && j !== null && "error" in j
              ? String((j as { error?: string }).error ?? "")
              : "";
          throw new Error(err || "Ошибка загрузки");
        }
        if (tabNow === "finance" || tabNow === "rework")
          setFinance(j as NonNullable<typeof finance>);
        else if (tabNow === "price") setPrice(j as NonNullable<typeof price>);
        else if (tabNow === "contractors")
          setContractors(j as NonNullable<typeof contractors>);
        else if (tabNow === "warehouse") {
          setWarehouse(j as NonNullable<typeof warehouse>);
        } else if (tabNow === "production") {
          setProduction(j as NonNullable<typeof production>);
        } else {
          setReconciliation(j as NonNullable<typeof reconciliation>);
        }
        loadedForQRef.current[tabNow] = activeQ;
      } catch (e) {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [tab, q, reconQ, activeQ, reloadTick, fromStr, toStr]);

  const exportHref = (type: "finance" | "price" | "contractors" | "warehouse") =>
    `/api/analytics/export?type=${type}&${q}`;
  const reconExportHref = (format: "xlsx" | "pdf") =>
    `/api/analytics/reconciliation/export?format=${format}&${reconQ}`;

  const setPreset = (days: number) => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date(to);
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0, 0, 0, 0);
    setFromStr(toYmd(from));
    setToStr(toYmd(to));
  };

  const priceChartData = useMemo(() => {
    if (!price?.rows?.length) return [];
    return price.rows.slice(0, 15).map((r) => ({
      name: `${r.code} ${r.name}`.slice(0, 42),
      revenue: r.revenue,
      orders: r.orderCount,
    }));
  }, [price]);

  const yearOptions = useMemo(() => {
    const y = new Date().getUTCFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)]">
            С даты
            <input
              type="date"
              value={fromStr}
              onChange={(e) => setFromStr(e.target.value)}
              className="rounded-md border border-[var(--input-border)] bg-[var(--surface-muted)] px-2 py-1.5 text-sm text-[var(--app-text)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)]">
            По дату
            <input
              type="date"
              value={toStr}
              onChange={(e) => setToStr(e.target.value)}
              className="rounded-md border border-[var(--input-border)] bg-[var(--surface-muted)] px-2 py-1.5 text-sm text-[var(--app-text)]"
            />
          </label>
          <button
            type="button"
            onClick={() => refetchActiveTab()}
            disabled={loading}
            className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Загрузка…" : "Применить"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-[var(--text-muted)]">Быстро:</span>
          <button
            type="button"
            onClick={() => setPreset(7)}
            className="rounded-full border border-[var(--card-border)] px-2.5 py-1 text-xs text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
          >
            7 дн.
          </button>
          <button
            type="button"
            onClick={() => setPreset(30)}
            className="rounded-full border border-[var(--card-border)] px-2.5 py-1 text-xs text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
          >
            30 дн.
          </button>
          <button
            type="button"
            onClick={() => {
              const m = currentMskMonthYmdRange();
              setFromStr(m.from);
              setToStr(m.to);
            }}
            className="rounded-full border border-[var(--card-border)] px-2.5 py-1 text-xs text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
          >
            Этот месяц
          </button>
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            className="rounded-full border border-[var(--sidebar-blue)] bg-[var(--sidebar-blue)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--sidebar-blue)] hover:bg-[var(--sidebar-blue)]/15"
          >
            Сравнить с периодом
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-[var(--card-border)] pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={
              tab === t.id
                ? "rounded-full bg-[var(--sidebar-blue)] px-3 py-1 text-xs font-semibold text-white"
                : "rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--card-bg)]"
            }
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </div>
      ) : null}

      {loading &&
      (tab === "finance" || tab === "rework"
        ? !finance
        : tab === "price"
          ? !price
          : tab === "contractors"
            ? !contractors
            : tab === "warehouse"
              ? !warehouse
              : tab === "production"
                ? !production
              : !reconciliation) ? (
        <p className="text-sm text-[var(--text-muted)]">Загрузка отчёта…</p>
      ) : null}

      {tab === "finance" && finance ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--text-secondary)]">
              Выручка по строкам состава × коэффициент срочности. Фактическая
              выручка — только наряды со статусом оплаты «Оплачено». Период по дате
              создания наряда. Отменённые наряды в сумму не входят. Суммы в блоках
              «Коррекции» и «Переделки» — только по строкам прайса «КП» в составе.
            </p>
            <a
              href={exportHref("finance")}
              className="shrink-0 rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
            >
              Выгрузить Excel
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Выручка
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {moneyRub(finance.totals.revenue)}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-300/60 bg-emerald-50/70 p-3 dark:border-emerald-800/60 dark:bg-emerald-950/30">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Фактическая выручка
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-950 dark:text-emerald-100">
                {moneyRub(finance.totals.actualRevenue)}
              </p>
              <p className="mt-0.5 text-[9px] leading-tight text-emerald-800/80 dark:text-emerald-200/80">
                только оплаченные
              </p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Заказов
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {finance.totals.orders}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Средний чек
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {moneyRub(finance.totals.avgCheck)}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Отменено
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {finance.totals.cancelled}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Коррекции
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {finance.totals.correctionOrders}
              </p>
              <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                {moneyRub(finance.totals.correctionRevenue)}
              </p>
              <p className="mt-0.5 text-[9px] leading-tight text-[var(--text-muted)]">
                по строкам «КП» в составе
              </p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Переделки
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {finance.totals.reworkOrders}
              </p>
              <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                {moneyRub(finance.totals.reworkRevenue)}
              </p>
              <p className="mt-0.5 text-[9px] leading-tight text-[var(--text-muted)]">
                по строкам «КП» в составе
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-sky-300/60 bg-sky-50/70 p-3 dark:border-sky-800/60 dark:bg-sky-950/25">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                  Частники
                </p>
                <p className="mt-1 text-xs text-sky-900/75 dark:text-sky-100/75">
                  Наряды без клиники: доктор заказывает как частное лицо.
                </p>
              </div>
              <div className="grid min-w-[min(100%,34rem)] flex-1 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-sky-900/60 dark:text-sky-100/60">
                    Выручка
                  </p>
                  <p className="mt-1 font-semibold tabular-nums text-sky-950 dark:text-sky-50">
                    {moneyRub(finance.privateClients.revenue)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-sky-900/60 dark:text-sky-100/60">
                    Факт
                  </p>
                  <p className="mt-1 font-semibold tabular-nums text-sky-950 dark:text-sky-50">
                    {moneyRub(finance.privateClients.actualRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-sky-900/60 dark:text-sky-100/60">
                    Заказов
                  </p>
                  <p className="mt-1 font-semibold tabular-nums text-sky-950 dark:text-sky-50">
                    {finance.privateClients.orders}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-sky-900/60 dark:text-sky-100/60">
                    Средний чек
                  </p>
                  <p className="mt-1 font-semibold tabular-nums text-sky-950 dark:text-sky-50">
                    {moneyRub(finance.privateClients.avgCheck)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {finance.correctionDetail ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
                <div className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Коррекции по направлению
                  </h4>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    Суммы — по строкам прайса «КП» в составе наряда
                  </p>
                </div>
                <div className="overflow-x-auto p-2">
                  <table className="w-full min-w-[240px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                        <th className="py-1 pr-2">Тип</th>
                        <th className="py-1 pr-2">Нарядов</th>
                        <th className="py-1">Выручка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finance.correctionDetail.byTrack.map((r) => (
                        <tr key={r.track} className="border-t border-[var(--border-subtle)]">
                          <td className="py-1.5 pr-2 text-[var(--text-strong)]">{r.label}</td>
                          <td className="py-1.5 pr-2 tabular-nums">{r.orders}</td>
                          <td className="py-1.5 tabular-nums">{moneyRub(r.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
                <div className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Платно / бесплатно
                  </h4>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    Те же суммы по строкам «КП»
                  </p>
                </div>
                <div className="space-y-2 p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-secondary)]">Платно</span>
                    <span className="tabular-nums">
                      {finance.correctionDetail.paidVsFree.paid.orders} нар. ·{" "}
                      {moneyRub(finance.correctionDetail.paidVsFree.paid.revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-secondary)]">Бесплатно</span>
                    <span className="tabular-nums">
                      {finance.correctionDetail.paidVsFree.free.orders} нар. ·{" "}
                      {moneyRub(finance.correctionDetail.paidVsFree.free.revenue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <div className="h-[320px] w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={finance.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                />
                <Tooltip
                  formatter={(v, name) => {
                    const n = typeof v === "number" ? v : Number(v);
                    return [
                      name === "revenue" || name === "actualRevenue" ? moneyRub(n) : v,
                      name === "revenue"
                        ? "Выручка"
                        : name === "actualRevenue"
                          ? "Фактическая выручка"
                          : "Заказов",
                    ];
                  }}
                  labelFormatter={(l) => l}
                  contentStyle={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="right"
                  dataKey="orders"
                  name="Заказов"
                  fill={CHART_COLORS.secondary}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  name="Выручка"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="actualRevenue"
                  name="Фактическая выручка"
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border border-[var(--card-border)]">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Переделки: какие позиции переделывают
              </h4>
              <span className="text-xs text-[var(--text-muted)]">
                Источник состава — «Продолжение работы»; суммы считаются по «КП»
              </span>
            </div>
            {finance.reworkTopItems.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[var(--text-muted)]">
                За выбранный период переделок нет или у переделок не указан исходный состав.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                      <th className="px-3 py-2">Код</th>
                      <th className="px-3 py-2">Позиция</th>
                      <th className="px-3 py-2">Переделок (нарядов)</th>
                      <th className="px-3 py-2">Строк</th>
                      <th className="px-3 py-2">Кол-во</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance.reworkTopItems.map((r, idx) => (
                      <tr
                        key={`${r.code}-${r.name}-${idx}`}
                        className="border-b border-[var(--border-subtle)] hover:bg-[var(--table-row-hover)]"
                      >
                        <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                        <td className="px-3 py-2 text-[var(--text-strong)]">{r.name}</td>
                        <td className="px-3 py-2 tabular-nums">{r.reworkOrders}</td>
                        <td className="px-3 py-2 tabular-nums">{r.lineCount}</td>
                        <td className="px-3 py-2 tabular-nums">{r.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === "rework" && finance ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--text-secondary)]">
              Наряды с типом «Переделка». Суммы считаются по строкам «КП» в текущем
              наряде, а таблица ниже показывает реальные работы из «Продолжение
              работы».
            </p>
            <a
              href={exportHref("finance")}
              className="shrink-0 rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
            >
              Выгрузить Excel
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Переделок
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {finance.totals.reworkOrders}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Сумма переделок
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {moneyRub(finance.totals.reworkRevenue)}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Коррекций всего
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {finance.totals.correctionOrders}
              </p>
            </div>
          </div>
          {finance.correctionDetail ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
                <div className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Коррекции по направлению
                  </h4>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    Суммы — по строкам прайса «КП» в составе наряда
                  </p>
                </div>
                <div className="overflow-x-auto p-2">
                  <table className="w-full min-w-[240px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                        <th className="py-1 pr-2">Тип</th>
                        <th className="py-1 pr-2">Нарядов</th>
                        <th className="py-1">Выручка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finance.correctionDetail.byTrack.map((r) => (
                        <tr key={`rw-${r.track}`} className="border-t border-[var(--border-subtle)]">
                          <td className="py-1.5 pr-2 text-[var(--text-strong)]">{r.label}</td>
                          <td className="py-1.5 pr-2 tabular-nums">{r.orders}</td>
                          <td className="py-1.5 tabular-nums">{moneyRub(r.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
                <div className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Платно / бесплатно
                  </h4>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    Те же суммы по строкам «КП»
                  </p>
                </div>
                <div className="space-y-2 p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-secondary)]">Платно</span>
                    <span className="tabular-nums">
                      {finance.correctionDetail.paidVsFree.paid.orders} нар. ·{" "}
                      {moneyRub(finance.correctionDetail.paidVsFree.paid.revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-secondary)]">Бесплатно</span>
                    <span className="tabular-nums">
                      {finance.correctionDetail.paidVsFree.free.orders} нар. ·{" "}
                      {moneyRub(finance.correctionDetail.paidVsFree.free.revenue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <div className="rounded-lg border border-[var(--card-border)]">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Какие позиции переделывают
              </h4>
              <span className="text-xs text-[var(--text-muted)]">
                По исходному наряду из «Продолжение работы»
              </span>
            </div>
            {finance.reworkTopItems.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[var(--text-muted)]">
                За выбранный период переделок нет или у переделок не указан исходный состав.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                      <th className="px-3 py-2">Код</th>
                      <th className="px-3 py-2">Позиция</th>
                      <th className="px-3 py-2">Переделок (нарядов)</th>
                      <th className="px-3 py-2">Строк</th>
                      <th className="px-3 py-2">Кол-во</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance.reworkTopItems.map((r, idx) => (
                      <tr
                        key={`${r.code}-${r.name}-${idx}`}
                        className="border-b border-[var(--border-subtle)] hover:bg-[var(--table-row-hover)]"
                      >
                        <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                        <td className="px-3 py-2 text-[var(--text-strong)]">{r.name}</td>
                        <td className="px-3 py-2 tabular-nums">{r.reworkOrders}</td>
                        <td className="px-3 py-2 tabular-nums">{r.lineCount}</td>
                        <td className="px-3 py-2 tabular-nums">{r.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === "production" && production ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--text-secondary)]">
              Переделки по объектам производственного чеклиста из CRM-канбана.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Событий переделки
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {production.totals.reworkEvents}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Объектов с переделкой
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {production.totals.reworkedObjects}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Карточек с переделкой
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {production.totals.reworkedCards}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--card-border)]">
            <div className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                По доскам
              </h4>
            </div>
            {production.byBoard.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[var(--text-muted)]">
                За период нет переделок в производственном чеклисте.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                      <th className="px-3 py-2">Доска</th>
                      <th className="px-3 py-2">Событий переделки</th>
                    </tr>
                  </thead>
                  <tbody>
                    {production.byBoard.map((row) => (
                      <tr
                        key={row.boardId}
                        className="border-b border-[var(--border-subtle)] hover:bg-[var(--table-row-hover)]"
                      >
                        <td className="px-3 py-2 text-[var(--text-strong)]">{row.boardTitle}</td>
                        <td className="px-3 py-2 tabular-nums">{row.reworkEvents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-[var(--card-border)]">
            <div className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Часто переделываемые объекты
              </h4>
            </div>
            {production.topItems.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[var(--text-muted)]">
                За период нет данных по объектам.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                      <th className="px-3 py-2">Объект</th>
                      <th className="px-3 py-2">Карточка</th>
                      <th className="px-3 py-2">Доска</th>
                      <th className="px-3 py-2">Файл</th>
                      <th className="px-3 py-2">Переделок</th>
                    </tr>
                  </thead>
                  <tbody>
                    {production.topItems.map((row) => (
                      <tr
                        key={`${row.cardId}:${row.objectText}:${row.sourceFileName}`}
                        className="border-b border-[var(--border-subtle)] hover:bg-[var(--table-row-hover)]"
                      >
                        <td className="px-3 py-2 text-[var(--text-strong)]">{row.objectText}</td>
                        <td className="px-3 py-2">{row.cardTitle}</td>
                        <td className="px-3 py-2">{row.boardTitle}</td>
                        <td className="px-3 py-2">{row.sourceFileName || "—"}</td>
                        <td className="px-3 py-2 tabular-nums">{row.reworkEvents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === "price" && price ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--text-secondary)]">
              Только строки категории «Позиция прайса». Суммы с учётом срочности
              по наряду.
            </p>
            <a
              href={exportHref("price")}
              className="shrink-0 rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
            >
              Выгрузить Excel
            </a>
          </div>
          {priceChartData.length > 0 ? (
            <div className="h-[min(400px,60vh)] w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priceChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={200}
                    tick={{ fontSize: 10, fill: CHART_COLORS.muted }}
                  />
                  <Tooltip
                    formatter={(v) => [
                      moneyRub(typeof v === "number" ? v : Number(v)),
                      "Выручка",
                    ]}
                    contentStyle={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Нет данных за период.</p>
          )}
          <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  <th className="px-3 py-2">Код</th>
                  <th className="px-3 py-2">Название</th>
                  <th className="px-3 py-2">Заказов</th>
                  <th className="px-3 py-2">Строк</th>
                  <th className="px-3 py-2">Выручка</th>
                </tr>
              </thead>
              <tbody>
                {price.rows.map((r) => (
                  <tr
                    key={r.priceListItemId}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--table-row-hover)]"
                  >
                    <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                    <td className="px-3 py-2 text-[var(--text-strong)]">{r.name}</td>
                    <td className="px-3 py-2 tabular-nums">{r.orderCount}</td>
                    <td className="px-3 py-2 tabular-nums">{r.lineCount}</td>
                    <td className="px-3 py-2 tabular-nums">{moneyRub(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "contractors" && contractors ? (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--text-secondary)]">
              Оборот и число нарядов по дате создания. «Заказов / мес» — оценка по
              длине выбранного периода.
            </p>
            <a
              href={exportHref("contractors")}
              className="shrink-0 rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
            >
              Выгрузить Excel
            </a>
          </div>
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Клиники
            </h3>
            <div className="h-[280px] w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={contractors.clinics.slice(0, 12)}
                  margin={{ bottom: 48, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="clinicName"
                    angle={-28}
                    textAnchor="end"
                    height={64}
                    interval={0}
                    tick={{ fontSize: 10, fill: CHART_COLORS.muted }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted }} />
                  <Tooltip
                    formatter={(v, key) => {
                      const n = typeof v === "number" ? v : Number(v);
                      return key === "revenue" ? moneyRub(n) : v;
                    }}
                    contentStyle={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Выручка" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Врачи (топ по выручке)
            </h3>
            <div className="h-[280px] w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={contractors.doctors.slice(0, 12)}
                  margin={{ bottom: 48, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="doctorName"
                    angle={-28}
                    textAnchor="end"
                    height={64}
                    interval={0}
                    tick={{ fontSize: 10, fill: CHART_COLORS.muted }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted }} />
                  <Tooltip
                    formatter={(v, key) => {
                      const n = typeof v === "number" ? v : Number(v);
                      return key === "revenue" ? moneyRub(n) : v;
                    }}
                    contentStyle={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="orderCount" name="Заказов" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <AnalyticsContractorsLifecyclePanel
            data={contractors.lifecycle ?? emptyContractorsLifecycle()}
            onChanged={() => refetchActiveTab()}
          />
        </div>
      ) : null}

      {tab === "warehouse" && warehouse ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--text-secondary)]">
              Журнал движений за период: типы операций и активные позиции.
            </p>
            <a
              href={exportHref("warehouse")}
              className="shrink-0 rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
            >
              Выгрузить Excel
            </a>
          </div>
          <p className="text-sm text-[var(--text-body)]">
            Записей в журнале:{" "}
            <strong className="tabular-nums">{warehouse.movementCount}</strong>
          </p>
          <div className="h-[260px] w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warehouse.byKind}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: CHART_COLORS.muted }}
                />
                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="count" name="Операций" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  <th className="px-3 py-2">Позиция</th>
                  <th className="px-3 py-2">Ед.</th>
                  <th className="px-3 py-2">Операций</th>
                  <th className="px-3 py-2">Σ |кол-во|</th>
                  <th className="px-3 py-2">Σ себестоимость</th>
                </tr>
              </thead>
              <tbody>
                {warehouse.topItems.map((r) => (
                  <tr
                    key={r.itemId}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--table-row-hover)]"
                  >
                    <td className="px-3 py-2 text-[var(--text-strong)]">{r.name}</td>
                    <td className="px-3 py-2">{r.unit}</td>
                    <td className="px-3 py-2 tabular-nums">{r.movements}</td>
                    <td className="px-3 py-2 tabular-nums">{r.quantityAbs}</td>
                    <td className="px-3 py-2 tabular-nums">{moneyRub(r.costRub)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "reconciliation" && reconciliation ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)]">
              Месяц
              <select
                value={reconMonth}
                onChange={(e) => setReconMonth(Number(e.target.value))}
                className="rounded-md border border-[var(--input-border)] bg-[var(--surface-muted)] px-2 py-1.5 text-sm text-[var(--app-text)]"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {monthNameRu(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)]">
              Год
              <select
                value={reconYear}
                onChange={(e) => setReconYear(Number(e.target.value))}
                className="rounded-md border border-[var(--input-border)] bg-[var(--surface-muted)] px-2 py-1.5 text-sm text-[var(--app-text)]"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label className="ml-2 inline-flex items-center gap-2 text-sm text-[var(--text-body)]">
              <input
                type="checkbox"
                checked={reconUseCompare}
                onChange={(e) => setReconUseCompare(e.target.checked)}
              />
              Сравнить с другим месяцем
            </label>
            {reconUseCompare ? (
              <>
                <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)]">
                  Сравнение: месяц
                  <select
                    value={reconCompareMonth}
                    onChange={(e) => setReconCompareMonth(Number(e.target.value))}
                    className="rounded-md border border-[var(--input-border)] bg-[var(--surface-muted)] px-2 py-1.5 text-sm text-[var(--app-text)]"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {monthNameRu(m)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-body)]">
                  Сравнение: год
                  <select
                    value={reconCompareYear}
                    onChange={(e) => setReconCompareYear(Number(e.target.value))}
                    className="rounded-md border border-[var(--input-border)] bg-[var(--surface-muted)] px-2 py-1.5 text-sm text-[var(--app-text)]"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--text-secondary)]">
              {`Сверки за ${formatMonthTitle(
                reconciliation.month.year,
                reconciliation.month.month,
              )}`}
              {reconciliation.compareMonth
                ? ` vs ${formatMonthTitle(
                    reconciliation.compareMonth.year,
                    reconciliation.compareMonth.month,
                  )}`
                : ""}
            </p>
            <div className="flex items-center gap-2">
              <a
                href={reconExportHref("xlsx")}
                className="rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
              >
                Выгрузить Excel
              </a>
              <a
                href={reconExportHref("pdf")}
                className="rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
              >
                Выгрузить PDF
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Итого за месяц
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {moneyRub(reconciliation.totals.monthTotalRub)}
              </p>
            </div>
            {reconciliation.compareMonth ? (
              <>
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Итого сравнения
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                    {moneyRub(reconciliation.totals.compareTotalRub ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Разница
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                    {moneyRub(reconciliation.totals.deltaRub ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Разница, %
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                    {reconciliation.totals.deltaPercent == null
                      ? "—"
                      : `${String(reconciliation.totals.deltaPercent).replace(".", ",")}%`}
                  </p>
                </div>
              </>
            ) : null}
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  <th className="px-3 py-2">Контрагент</th>
                  <th className="px-3 py-2">Периоды в месяце</th>
                  <th className="px-3 py-2 text-right">Сумма месяца</th>
                  <th className="px-3 py-2">Периоды сравнения</th>
                  <th className="px-3 py-2 text-right">Сумма сравнения</th>
                  <th className="px-3 py-2 text-right">Разница</th>
                  <th className="px-3 py-2 text-right">Разница, %</th>
                </tr>
              </thead>
              <tbody>
                {reconciliation.rows.map((r) => (
                  <tr
                    key={r.clinicId}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--table-row-hover)]"
                  >
                    <td className="px-3 py-2 text-[var(--text-strong)]">
                      {r.contractorName}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--text-body)]">
                      {r.periods.map((p) => (
                        <div key={`${r.clinicId}-${p.snapshotId}`}>
                          {p.periodLabelRu}: {moneyRub(p.amountRub)}
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {moneyRub(r.monthTotalRub)}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--text-body)]">
                      {r.comparePeriods.length === 0
                        ? "—"
                        : r.comparePeriods.map((p) => (
                            <div key={`${r.clinicId}-cmp-${p.snapshotId}`}>
                              {p.periodLabelRu}: {moneyRub(p.amountRub)}
                            </div>
                          ))}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.compareTotalRub == null ? "—" : moneyRub(r.compareTotalRub)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.deltaRub == null ? "—" : moneyRub(r.deltaRub)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.deltaPercent == null
                        ? "—"
                        : `${String(r.deltaPercent).replace(".", ",")}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "deadlines" ? (
        <AnalyticsDeadlinesPanel dateQuery={q} loading={loading} error={error} />
      ) : null}

      {compareOpen ? (
        <AnalyticsCompareModal
          key={tab}
          tab={tab}
          fromStr={fromStr}
          toStr={toStr}
          reconYear={reconYear}
          reconMonth={reconMonth}
          onClose={() => setCompareOpen(false)}
        />
      ) : null}
    </div>
  );
}
