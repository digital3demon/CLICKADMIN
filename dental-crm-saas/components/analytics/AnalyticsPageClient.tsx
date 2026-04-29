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
  defaultAnalyticsRange,
  toYmd,
} from "@/lib/analytics/range";

const TABS = [
  { id: "finance" as const, label: "Финансы" },
  { id: "price" as const, label: "Позиции прайса" },
  { id: "contractors" as const, label: "Клиники и врачи" },
  { id: "warehouse" as const, label: "Склад" },
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
      orders: number;
      cancelled: number;
      avgCheck: number;
    };
    series: { date: string; revenue: number; orders: number }[];
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
  } | null>(null);

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

  const q = useMemo(
    () =>
      `from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`,
    [fromStr, toStr],
  );

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
    setError(null);
  }, [q]);

  useEffect(() => {
    if (loadedForQRef.current[tab] === q) return;
    const ac = new AbortController();
    const tabNow = tab;
    (async () => {
      setLoading(true);
      setError(null);
      const path =
        tabNow === "finance"
          ? `/api/analytics/finance?${q}`
          : tabNow === "price"
            ? `/api/analytics/price-items?${q}`
            : tabNow === "contractors"
              ? `/api/analytics/contractors?${q}`
              : `/api/analytics/warehouse?${q}`;
      try {
        const res = await fetch(path, { signal: ac.signal });
        const j = (await res.json()) as unknown;
        if (ac.signal.aborted) return;
        if (!res.ok) {
          const err =
            typeof j === "object" && j !== null && "error" in j
              ? String((j as { error?: string }).error ?? "")
              : "";
          throw new Error(err || "Ошибка загрузки");
        }
        if (tabNow === "finance")
          setFinance(j as NonNullable<typeof finance>);
        else if (tabNow === "price") setPrice(j as NonNullable<typeof price>);
        else if (tabNow === "contractors")
          setContractors(j as NonNullable<typeof contractors>);
        else setWarehouse(j as NonNullable<typeof warehouse>);
        loadedForQRef.current[tabNow] = q;
      } catch (e) {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [tab, q, reloadTick]);

  const exportHref = (type: "finance" | "price" | "contractors" | "warehouse") =>
    `/api/analytics/export?type=${type}&${q}`;

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
      (tab === "finance"
        ? !finance
        : tab === "price"
          ? !price
          : tab === "contractors"
            ? !contractors
            : !warehouse) ? (
        <p className="text-sm text-[var(--text-muted)]">Загрузка отчёта…</p>
      ) : null}

      {tab === "finance" && finance ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--text-secondary)]">
              Выручка по строкам состава × коэффициент срочности. Период по дате
              создания наряда. Отменённые наряды в сумму не входят.
            </p>
            <a
              href={exportHref("finance")}
              className="shrink-0 rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
            >
              Выгрузить Excel
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Выручка
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {moneyRub(finance.totals.revenue)}
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
          </div>
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
                      name === "revenue" ? moneyRub(n) : v,
                      name === "revenue" ? "Выручка" : "Заказов",
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
              </ComposedChart>
            </ResponsiveContainer>
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
    </div>
  );
}
