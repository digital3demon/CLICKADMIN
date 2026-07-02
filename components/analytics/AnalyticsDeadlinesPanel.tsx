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
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
      <div className="text-xs font-medium text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-xl font-semibold text-[var(--app-text)]">{value}</div>
      {hint ? (
        <div className="mt-1 text-[0.68rem] text-[var(--text-secondary)]">{hint}</div>
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
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
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
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              subTab === t.id
                ? "bg-[var(--sidebar-blue)] text-white"
                : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            }`}
            onClick={() => setSubTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <a
          href={exportHref}
          className="ml-auto rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm text-[var(--sidebar-blue)] hover:bg-[var(--surface-hover)]"
        >
          Скачать Excel
        </a>
      </div>

      <DeadlinesScheduleSettings schedule={schedule} onChange={setSchedule} />

      {subTab === "admin" ? (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <label className="flex flex-wrap items-end gap-3 text-sm">
            <span className="text-[var(--text-secondary)]">
              Порог занесения (рабочие часы)
            </span>
            <input
              type="number"
              min={0.5}
              max={72}
              step={0.5}
              className="w-24 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 py-1"
              value={slaHours}
              onChange={(e) => setSlaHours(Number(e.target.value) || DEFAULT_ADMIN_SLA_HOURS)}
            />
            <button
              type="button"
              className="rounded-lg bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm text-white"
              onClick={() => void load()}
            >
              Применить
            </button>
          </label>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            От поступления работы до оформления наряда; погрешность ±30 мин. Период
            фильтруется по дате поступления.
          </p>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-secondary)]">
          От оформления до первого перехода в «Сдана админам»; норматив — макс.
          leadWorkingDays из прайса (количество в позиции не умножает срок). Период
          — по дате оформления. Погрешность ±30 мин.
        </p>
      )}

      {(error || localError) && (
        <p className="text-sm text-red-600 dark:text-red-400">{error || localError}</p>
      )}

      {busy && !admin && !work ? (
        <p className="text-sm text-[var(--text-secondary)]">Загрузка…</p>
      ) : null}

      {subTab === "admin" && admin ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <h4 className="mb-2 text-sm font-semibold">Распределение за период</h4>
              <BucketChart buckets={admin.buckets} />
            </div>
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Раньше порога</span>
                  <span>
                    {admin.buckets.early} ({admin.bucketPercents.early}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Вовремя</span>
                  <span>
                    {admin.buckets.onTime} ({admin.bucketPercents.onTime}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Позже</span>
                  <span>
                    {admin.buckets.late} ({admin.bucketPercents.late}%)
                  </span>
                </div>
                <div className="flex justify-between border-t border-[var(--card-border)] pt-2 font-medium">
                  <span>Всего в периоде</span>
                  <span>{admin.buckets.total}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {subTab === "work" && work ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Средний факт (всё время)"
              value={formatDurationMinutesRu(work.allTimeAverageMinutes)}
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
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <h4 className="mb-2 text-sm font-semibold">
                С нормативом из прайса (период)
              </h4>
              <BucketChart buckets={work.withNormative} />
            </div>
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Раньше норматива</span>
                  <span>
                    {work.withNormative.early} (
                    {work.withNormative.bucketPercents.early}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Вовремя</span>
                  <span>
                    {work.withNormative.onTime} (
                    {work.withNormative.bucketPercents.onTime}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Позже</span>
                  <span>
                    {work.withNormative.late} ({work.withNormative.bucketPercents.late}%)
                  </span>
                </div>
                <div className="flex justify-between border-t border-[var(--card-border)] pt-2">
                  <span>Средний с нормативом</span>
                  <span>
                    {formatDurationMinutesRu(work.withNormative.periodAverageMinutes)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Без норматива (всё время)</span>
                  <span>
                    {formatDurationMinutesRu(
                      work.withoutNormative.allTimeAverageMinutes,
                    )}
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
