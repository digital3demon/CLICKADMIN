"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DeadlinesScheduleSettings } from "@/components/analytics/DeadlinesScheduleSettings";
import {
  DEFAULT_ADMIN_SLA_HOURS,
  defaultDeadlinesSchedule,
  formatDurationMinutesRu,
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
      <ResponsiveContainer width="100%" height="100%">
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
      </ResponsiveContainer>
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
        <>
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Средний факт (всё время)"
              value={formatDurationMinutesRu(work.allTimeAverageMinutes)}
              hint="Оформление → сдана админам"
            />
            <KpiCard
              label="Средний факт (период)"
              value={formatDurationMinutesRu(work.periodAverageMinutes)}
            />
            <KpiCard
              label="С нормативом — вовремя"
              value={`${work.withNormative.onTime} (${work.withNormative.bucketPercents.onTime}%)`}
            />
            <KpiCard
              label="Без норматива в прайсе"
              value={String(work.withoutNormative.count)}
              hint={`Средн. ${formatDurationMinutesRu(work.withoutNormative.periodAverageMinutes)} за период`}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[var(--app-text)]">
                С нормативом из прайса (период)
              </h4>
              <BucketChart buckets={work.withNormative} />
            </div>
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <StatsBreakdown
                rows={[
                  {
                    label: "Раньше норматива",
                    count: work.withNormative.early,
                    percent: work.withNormative.bucketPercents.early,
                  },
                  {
                    label: "Вовремя",
                    count: work.withNormative.onTime,
                    percent: work.withNormative.bucketPercents.onTime,
                  },
                  {
                    label: "Позже",
                    count: work.withNormative.late,
                    percent: work.withNormative.bucketPercents.late,
                  },
                ]}
                totalLabel="Всего с нормативом"
                total={work.withNormative.total}
              />
              <div className="mt-4 border-t border-[var(--card-border)] pt-3 text-sm">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Без норматива (период)</span>
                  <span className="tabular-nums font-medium text-[var(--app-text)]">
                    {work.withoutNormative.count}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-[var(--text-secondary)]">
                  <span>Средний с нормативом</span>
                  <span className="tabular-nums font-medium text-[var(--app-text)]">
                    {formatDurationMinutesRu(work.withNormative.periodAverageMinutes)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
