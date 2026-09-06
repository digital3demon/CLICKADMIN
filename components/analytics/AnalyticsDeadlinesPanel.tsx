"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartResponsiveContainer } from "@/components/analytics/ChartResponsiveContainer";
import { DeadlinesScheduleSettings } from "@/components/analytics/DeadlinesScheduleSettings";
import {
  DEFAULT_ADMIN_SLA_HOURS,
  defaultDeadlinesSchedule,
  formatDurationMinutesRu,
  formatDurationDaysHoursRu,
  workDayDurationMinutes,
  scheduleQueryString,
  type DeadlinesScheduleConfig,
} from "@/lib/analytics/deadlines-schedule";

type AdminReport = {
  allTimeAverageMinutes: number;
  periodAverageMinutes: number;
  slaHours: number;
  buckets: { early: number; onTime: number; late: number; total: number };
  bucketPercents: { early: number; onTime: number; late: number };
};

const CHART_COLORS = {
  primary: "#0ea5e9",
  muted: "#64748b",
};

type WorkPriceItemRow = {
  priceListItemId: string;
  code: string;
  name: string;
  leadWorkingDays: number | null;
  orderCount: number;
  lineCount: number;
  averageDurationMinutes: number;
  withNormativeLineCount: number;
  early: number;
  onTime: number;
  late: number;
};

type WorkReport = {
  allTimeAverageMinutes: number;
  periodAverageMinutes: number;
  completedAllTime: number;
  completedInPeriod: number;
  withNormative: {
    early: number;
    onTime: number;
    late: number;
    total: number;
    bucketPercents: { early: number; onTime: number; late: number };
    periodAverageMinutes: number;
  };
  withoutNormative: {
    count: number;
    periodAverageMinutes: number;
    allTimeAverageMinutes: number;
  };
  rows: WorkPriceItemRow[];
};

const SUB_TABS = [
  { id: "admin" as const, label: "Админ" },
  { id: "work" as const, label: "Сроки работ" },
];

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3.5">
      <div className="text-[0.68rem] font-medium text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1.5 text-xl font-semibold tabular-nums text-[var(--app-text)]">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-[0.65rem] text-[var(--text-secondary)]">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function BucketChart({
  buckets,
}: {
  buckets: { early: number; onTime: number; late: number };
}) {
  const data = [
    { name: "Раньше", count: buckets.early },
    { name: "Вовремя", count: buckets.onTime },
    { name: "Позже", count: buckets.late },
  ];
  return (
    <div className="h-56 w-full min-w-0">
      <ChartResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" fill="var(--sidebar-blue)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartResponsiveContainer>
    </div>
  );
}

function StatsBreakdown({
  rows,
  totalLabel,
  total,
}: {
  rows: Array<{ label: string; count: number; percent: number }>;
  totalLabel: string;
  total: number;
}) {
  return (
    <div className="flex h-full flex-col justify-center space-y-3 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3">
          <span className="text-[var(--text-secondary)]">{row.label}</span>
          <span className="shrink-0 tabular-nums font-medium text-[var(--app-text)]">
            {row.count} ({row.percent}%)
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--card-border)] pt-3 font-semibold text-[var(--app-text)]">
        <span>{totalLabel}</span>
        <span className="tabular-nums">{total}</span>
      </div>
    </div>
  );
}

export function AnalyticsDeadlinesPanel({
  dateQuery,
  loading,
  error,
}: {
  dateQuery: string;
  loading: boolean;
  error: string | null;
}) {
  const [subTab, setSubTab] = useState<"admin" | "work">("admin");
  const [schedule, setSchedule] = useState<DeadlinesScheduleConfig>(() =>
    defaultDeadlinesSchedule(),
  );
  const [slaHours, setSlaHours] = useState(DEFAULT_ADMIN_SLA_HOURS);
  const [admin, setAdmin] = useState<AdminReport | null>(null);
  const [work, setWork] = useState<WorkReport | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const scheduleQ = useMemo(
    () => scheduleQueryString(schedule, subTab === "admin" ? slaHours : undefined),
    [schedule, slaHours, subTab],
  );
  const fullQ = `${dateQuery}&${scheduleQ}`;

  const load = useCallback(async () => {
    setLocalLoading(true);
    setLocalError(null);
    try {
      const path =
        subTab === "admin"
          ? `/api/analytics/deadlines/admin?${fullQ}`
          : `/api/analytics/deadlines/work?${fullQ}`;
      const res = await fetch(path, { cache: "no-store" });
      const data = (await res.json()) as { error?: string } & AdminReport & WorkReport;
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (subTab === "admin") {
        setAdmin(data as AdminReport);
      } else {
        setWork(data as WorkReport);
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLocalLoading(false);
    }
  }, [fullQ, subTab]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportHref = `/api/analytics/deadlines/export?type=${subTab}&${fullQ}`;
  const busy = loading || localLoading;

  const workChartData = useMemo(() => {
    if (!work?.rows?.length) return [];
    return work.rows.slice(0, 15).map((r) => ({
      name: `${r.code} ${r.name}`.slice(0, 42),
      averageMinutes: r.averageDurationMinutes,
      orders: r.orderCount,
    }));
  }, [work]);

  const workDayMinutes = useMemo(
    () => workDayDurationMinutes(schedule),
    [schedule],
  );

  const formatWorkDuration = useCallback(
    (minutes: number) =>
      formatDurationDaysHoursRu(minutes, workDayMinutes),
    [workDayMinutes],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={subTab === t.id}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              subTab === t.id
                ? "bg-[var(--sidebar-blue)] text-white shadow-sm"
                : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            }`}
            onClick={() => setSubTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <a
          href={exportHref}
          className="ml-auto rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
        >
          Скачать Excel
        </a>
      </div>

      <DeadlinesScheduleSettings
        schedule={schedule}
        onChange={setSchedule}
        mode={subTab}
        slaHours={subTab === "admin" ? slaHours : undefined}
        onSlaHoursChange={subTab === "admin" ? setSlaHours : undefined}
        onApply={() => void load()}
        applying={busy}
      />

      {(error || localError) && (
        <p className="text-sm text-red-600 dark:text-red-400">{error || localError}</p>
      )}

      {busy && !admin && !work ? (
        <p className="text-sm text-[var(--text-secondary)]">Загрузка…</p>
      ) : null}

      {subTab === "admin" && admin ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Средний срок за всё время"
              value={formatDurationMinutesRu(admin.allTimeAverageMinutes)}
              hint="Поступление → оформление"
            />
            <KpiCard
              label="Средний за период"
              value={formatDurationMinutesRu(admin.periodAverageMinutes)}
            />
            <KpiCard
              label="Вовремя"
              value={`${admin.buckets.onTime} (${admin.bucketPercents.onTime}%)`}
            />
            <KpiCard
              label="Позже порога"
              value={`${admin.buckets.late} (${admin.bucketPercents.late}%)`}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[var(--app-text)]">
                Распределение за период
              </h4>
              <BucketChart buckets={admin.buckets} />
            </div>
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <StatsBreakdown
                rows={[
                  {
                    label: "Раньше порога",
                    count: admin.buckets.early,
                    percent: admin.bucketPercents.early,
                  },
                  {
                    label: "Вовремя",
                    count: admin.buckets.onTime,
                    percent: admin.bucketPercents.onTime,
                  },
                  {
                    label: "Позже",
                    count: admin.buckets.late,
                    percent: admin.bucketPercents.late,
                  },
                ]}
                totalLabel="Всего в периоде"
                total={admin.buckets.total}
              />
            </div>
          </div>
        </>
      ) : null}

      {subTab === "work" && work ? (
        <div className="space-y-6">
          {work.completedAllTime === 0 ? (
            <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
              Нет нарядов в колонке «Сдана админам» (ни в истории, ни сейчас на
              доске). Учитываются только завершённые работы; тестовые, отменённые
              и коррекции исключены.
            </p>
          ) : work.completedInPeriod === 0 ? (
            <p className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              За выбранный период оформления нет сданных админам нарядов (всего
              сдано: {work.completedAllTime}). Расширьте даты «с / по» вверху
              страницы.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCard
              label="Средний срок (всё время)"
              value={formatWorkDuration(work.allTimeAverageMinutes)}
              hint="Оформление → сдана админам, по нарядам"
            />
            <KpiCard
              label="Средний срок (период)"
              value={formatWorkDuration(work.periodAverageMinutes)}
              hint="Период — по дате оформления"
            />
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            По каждой позиции прайса в сданном наряде: одна строка или несколько
            штук одной позиции — одна запись в статистике. Срок — рабочее время
            от оформления до «Сдана админам»; сравнение с макс. нормативом
            позиций в наряде (leadWorkingDays), погрешность ±30 мин.
          </p>
          {workChartData.length > 0 ? (
            <div className="h-[min(400px,60vh)] w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2">
              <ChartResponsiveContainer>
                <BarChart
                  data={workChartData}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={200}
                    tick={{ fontSize: 10, fill: CHART_COLORS.muted }}
                  />
                  <Tooltip
                    formatter={(v) => [
                      formatWorkDuration(
                        typeof v === "number" ? v : Number(v),
                      ),
                      "Средний срок",
                    ]}
                    contentStyle={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar
                    dataKey="averageMinutes"
                    fill={CHART_COLORS.primary}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Нет позиций прайса в сданных нарядах за период.
            </p>
          )}
          <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  <th className="px-3 py-2">Код</th>
                  <th className="px-3 py-2">Название</th>
                  <th className="px-3 py-2">Нарядов</th>
                  <th className="px-3 py-2">Строк</th>
                  <th className="px-3 py-2">Норматив</th>
                  <th className="px-3 py-2">Средний срок</th>
                  <th className="px-3 py-2">Раньше</th>
                  <th className="px-3 py-2">Вовремя</th>
                  <th className="px-3 py-2">Позже</th>
                </tr>
              </thead>
              <tbody>
                {work.rows.map((r) => (
                  <tr
                    key={r.priceListItemId}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--table-row-hover)]"
                  >
                    <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                    <td className="px-3 py-2 text-[var(--text-strong)]">{r.name}</td>
                    <td className="px-3 py-2 tabular-nums">{r.orderCount}</td>
                    <td className="px-3 py-2 tabular-nums">{r.lineCount}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.leadWorkingDays != null ? `${r.leadWorkingDays} дн.` : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatWorkDuration(r.averageDurationMinutes)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{r.early}</td>
                    <td className="px-3 py-2 tabular-nums">{r.onTime}</td>
                    <td className="px-3 py-2 tabular-nums">{r.late}</td>
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
