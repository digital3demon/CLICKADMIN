"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartResponsiveContainer } from "@/components/analytics/ChartResponsiveContainer";
import {
  COMPARE_PERIOD_COLORS,
  deltaPercent,
  formatPeriodLabelRu,
  monthTitleRu,
  type ComparePeriodSlot,
} from "@/lib/analytics/compare-periods";

function moneyRub(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNum(n: number, money: boolean): string {
  if (money) return moneyRub(n);
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(n);
}

function DeltaCell({ current, previous }: { current: number; previous: number }) {
  const pct = deltaPercent(current, previous);
  if (pct === null) {
    return <span className="text-[11px] text-[var(--text-muted)]">нет базы</span>;
  }
  if (Math.abs(pct) < 0.05) {
    return <span className="text-[11px] text-[var(--text-muted)]">0%</span>;
  }
  const up = pct > 0;
  return (
    <span
      className={`text-[11px] font-medium tabular-nums ${
        up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
      }`}
    >
      {up ? "↑" : "↓"} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export function periodCaption(slot: ComparePeriodSlot, recon: boolean): string {
  return recon
    ? monthTitleRu(slot.year, slot.month)
    : formatPeriodLabelRu(slot.from, slot.to);
}

type MetricRow = {
  key: string;
  label: string;
  values: number[];
  money?: boolean;
};

function MetricTable({
  slots,
  rows,
  recon,
}: {
  slots: ComparePeriodSlot[];
  rows: MetricRow[];
  recon: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-[var(--surface-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            <th className="px-3 py-2">Показатель</th>
            {slots.map((s, i) => (
              <th key={s.id} className="px-3 py-2">
                <span className="inline-flex items-center gap-1.5 normal-case">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: COMPARE_PERIOD_COLORS[i] }}
                  />
                  {periodCaption(s, recon)}
                </span>
              </th>
            ))}
            {slots.length > 1 ? (
              <th className="px-3 py-2 normal-case">К пред.</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const last = r.values[r.values.length - 1] ?? 0;
            const prev = r.values[r.values.length - 2] ?? 0;
            return (
              <tr key={r.key} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2 text-[var(--text-strong)]">{r.label}</td>
                {r.values.map((v, i) => (
                  <td key={slots[i]?.id ?? i} className="px-3 py-2 tabular-nums">
                    {formatNum(v, Boolean(r.money))}
                  </td>
                ))}
                {slots.length > 1 ? (
                  <td className="px-3 py-2">
                    <DeltaCell current={last} previous={prev} />
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GroupedBars({
  slots,
  series,
  recon,
}: {
  slots: ComparePeriodSlot[];
  series: { name: string; values: number[] }[];
  recon: boolean;
}) {
  if (series.length === 0) return null;
  const data = series.map((s) => {
    const row: Record<string, string | number> = { name: s.name };
    slots.forEach((p, i) => {
      row[`p${i}`] = s.values[i] ?? 0;
    });
    return row;
  });
  return (
    <div className="h-[260px] w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-2">
      <ChartResponsiveContainer>
        <BarChart data={data} margin={{ bottom: 8, left: 4, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
          <Tooltip
            contentStyle={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend />
          {slots.map((p, i) => (
            <Bar
              key={p.id}
              dataKey={`p${i}`}
              name={periodCaption(p, recon)}
              fill={COMPARE_PERIOD_COLORS[i]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ChartResponsiveContainer>
    </div>
  );
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function AnalyticsCompareResults({
  tab,
  slots,
  payloads,
}: {
  tab: string;
  slots: ComparePeriodSlot[];
  payloads: unknown[];
}) {
  const recon = tab === "reconciliation";

  if (tab === "finance" || tab === "rework") {
    const totals = payloads.map((p) => asObj(asObj(p)?.totals));
    const priv = payloads.map((p) => asObj(asObj(p)?.privateClients));
    const financeRows: MetricRow[] =
      tab === "finance"
        ? [
            { key: "rev", label: "Выручка", values: totals.map((t) => num(t?.revenue)), money: true },
            {
              key: "act",
              label: "Факт. выручка",
              values: totals.map((t) => num(t?.actualRevenue)),
              money: true,
            },
            { key: "ord", label: "Нарядов", values: totals.map((t) => num(t?.orders)) },
            { key: "avg", label: "Средний чек", values: totals.map((t) => num(t?.avgCheck)), money: true },
            { key: "can", label: "Отменено", values: totals.map((t) => num(t?.cancelled)) },
            {
              key: "prv",
              label: "Частные, выручка",
              values: priv.map((t) => num(t?.revenue)),
              money: true,
            },
          ]
        : [
            { key: "rw", label: "Переделок", values: totals.map((t) => num(t?.reworkOrders)) },
            {
              key: "rwR",
              label: "Сумма переделок",
              values: totals.map((t) => num(t?.reworkRevenue)),
              money: true,
            },
            { key: "cr", label: "Коррекций", values: totals.map((t) => num(t?.correctionOrders)) },
            {
              key: "crR",
              label: "Сумма коррекций",
              values: totals.map((t) => num(t?.correctionRevenue)),
              money: true,
            },
          ];
    return (
      <div className="space-y-4">
        <MetricTable slots={slots} rows={financeRows} recon={recon} />
        <GroupedBars
          slots={slots}
          recon={recon}
          series={
            tab === "finance"
              ? [
                  { name: "Выручка", values: totals.map((t) => num(t?.revenue)) },
                  { name: "Наряды", values: totals.map((t) => num(t?.orders)) },
                ]
              : [
                  { name: "Переделки", values: totals.map((t) => num(t?.reworkOrders)) },
                  { name: "Коррекции", values: totals.map((t) => num(t?.correctionOrders)) },
                ]
          }
        />
      </div>
    );
  }

  if (tab === "production") {
    const totals = payloads.map((p) => asObj(asObj(p)?.totals));
    const rows: MetricRow[] = [
      { key: "ev", label: "Событий переделки", values: totals.map((t) => num(t?.reworkEvents)) },
      { key: "ob", label: "Объектов", values: totals.map((t) => num(t?.reworkedObjects)) },
      { key: "cd", label: "Карточек", values: totals.map((t) => num(t?.reworkedCards)) },
    ];
    return (
      <div className="space-y-4">
        <MetricTable slots={slots} rows={rows} recon={false} />
        <GroupedBars
          slots={slots}
          recon={false}
          series={[{ name: "События", values: totals.map((t) => num(t?.reworkEvents)) }]}
        />
      </div>
    );
  }

  if (tab === "price") {
    const lists = payloads.map((p) => {
      const rows = asObj(p)?.rows;
      return Array.isArray(rows) ? rows : [];
    });
    const keys = new Map<string, string>();
    for (const list of lists) {
      for (const raw of list) {
        const o = asObj(raw);
        if (!o) continue;
        const id = String(o.priceListItemId ?? o.code ?? "");
        if (!id || keys.has(id)) continue;
        keys.set(id, `${String(o.code ?? "")} ${String(o.name ?? "")}`.trim());
      }
    }
    const top = [...keys.entries()].slice(0, 16);
    const rows: MetricRow[] = top.map(([id, label]) => ({
      key: id,
      label,
      money: true,
      values: lists.map((list) => {
        const hit = list.find((raw) => {
          const o = asObj(raw);
          return o && String(o.priceListItemId ?? o.code ?? "") === id;
        });
        return num(asObj(hit)?.revenue);
      }),
    }));
    return rows.length === 0 ? (
      <p className="text-sm text-[var(--text-muted)]">В выбранных периодах нет позиций прайса.</p>
    ) : (
      <MetricTable slots={slots} rows={rows} recon={false} />
    );
  }

  if (tab === "contractors") {
    const life = payloads.map((p) => asObj(asObj(p)?.lifecycle));
    const rows: MetricRow[] = [
      {
        key: "nd",
        label: "Новые доктора",
        values: life.map((l) => (Array.isArray(l?.newDoctors) ? l!.newDoctors.length : 0)),
      },
      {
        key: "nc",
        label: "Новые клиники",
        values: life.map((l) => (Array.isArray(l?.newClinics) ? l!.newClinics.length : 0)),
      },
      {
        key: "rd",
        label: "Вернувшиеся доктора",
        values: life.map((l) =>
          Array.isArray(l?.returnedDoctors) ? l!.returnedDoctors.length : 0,
        ),
      },
      {
        key: "rc",
        label: "Вернулись клиники",
        values: life.map((l) =>
          Array.isArray(l?.returnedClinics) ? l!.returnedClinics.length : 0,
        ),
      },
      {
        key: "dd",
        label: "Пропали доктора",
        values: life.map((l) =>
          Array.isArray(l?.disappearedDoctors) ? l!.disappearedDoctors.length : 0,
        ),
      },
      {
        key: "dc",
        label: "Пропали клиники",
        values: life.map((l) =>
          Array.isArray(l?.disappearedClinics) ? l!.disappearedClinics.length : 0,
        ),
      },
    ];
    const clinics = payloads.map((p) => {
      const list = asObj(p)?.clinics;
      return Array.isArray(list) ? list : [];
    });
    const names = new Map<string, string>();
    for (const list of clinics) {
      for (const raw of list) {
        const o = asObj(raw);
        if (!o) continue;
        const name = String(o.clinicName ?? "");
        if (name && !names.has(name)) names.set(name, name);
      }
    }
    const clinicRows: MetricRow[] = [...names.keys()].slice(0, 12).map((name) => ({
      key: name,
      label: name,
      money: true,
      values: clinics.map((list) => {
        const hit = list.find((raw) => asObj(raw)?.clinicName === name);
        return num(asObj(hit)?.revenue);
      }),
    }));
    return (
      <div className="space-y-4">
        <MetricTable slots={slots} rows={rows} recon={false} />
        {clinicRows.length > 0 ? (
          <>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Выручка клиник
            </h4>
            <MetricTable slots={slots} rows={clinicRows} recon={false} />
          </>
        ) : null}
      </div>
    );
  }

  if (tab === "warehouse") {
    const rows: MetricRow[] = [
      {
        key: "mv",
        label: "Движений",
        values: payloads.map((p) => num(asObj(p)?.movementCount)),
      },
    ];
    const kinds = payloads.map((p) => {
      const list = asObj(p)?.byKind;
      return Array.isArray(list) ? list : [];
    });
    const kindNames = new Map<string, string>();
    for (const list of kinds) {
      for (const raw of list) {
        const o = asObj(raw);
        if (!o) continue;
        const label = String(o.label ?? o.kind ?? "");
        if (label) kindNames.set(label, label);
      }
    }
    for (const label of kindNames.keys()) {
      rows.push({
        key: label,
        label,
        values: kinds.map((list) => {
          const hit = list.find((raw) => String(asObj(raw)?.label ?? "") === label);
          return num(asObj(hit)?.count);
        }),
      });
    }
    return <MetricTable slots={slots} rows={rows} recon={false} />;
  }

  if (tab === "deadlines") {
    const rows: MetricRow[] = [
      {
        key: "avg",
        label: "Среднее за период, мин (админ)",
        values: payloads.map((p) => num(asObj(p)?.periodAverageMinutes)),
      },
      {
        key: "all",
        label: "Среднее за всё время, мин",
        values: payloads.map((p) => num(asObj(p)?.allTimeAverageMinutes)),
      },
      {
        key: "early",
        label: "Раньше срока",
        values: payloads.map((p) => num(asObj(asObj(p)?.buckets)?.early)),
      },
      {
        key: "on",
        label: "Вовремя",
        values: payloads.map((p) => num(asObj(asObj(p)?.buckets)?.onTime)),
      },
      {
        key: "late",
        label: "Позже",
        values: payloads.map((p) => num(asObj(asObj(p)?.buckets)?.late)),
      },
    ];
    return (
      <div className="space-y-4">
        <MetricTable slots={slots} rows={rows} recon={false} />
        <GroupedBars
          slots={slots}
          recon={false}
          series={[
            { name: "Раньше", values: payloads.map((p) => num(asObj(asObj(p)?.buckets)?.early)) },
            { name: "Вовремя", values: payloads.map((p) => num(asObj(asObj(p)?.buckets)?.onTime)) },
            { name: "Позже", values: payloads.map((p) => num(asObj(asObj(p)?.buckets)?.late)) },
          ]}
        />
      </div>
    );
  }

  if (tab === "reconciliation") {
    const rows: MetricRow[] = [
      {
        key: "sum",
        label: "Сумма сверок",
        money: true,
        values: payloads.map((p) => num(asObj(asObj(p)?.totals)?.monthTotalRub)),
      },
    ];
    const lists = payloads.map((p) => {
      const list = asObj(p)?.rows;
      return Array.isArray(list) ? list : [];
    });
    const names = new Map<string, string>();
    for (const list of lists) {
      for (const raw of list) {
        const o = asObj(raw);
        if (!o) continue;
        const name = String(o.contractorName ?? "");
        if (name) names.set(name, name);
      }
    }
    const clinicRows: MetricRow[] = [...names.keys()].slice(0, 20).map((name) => ({
      key: name,
      label: name,
      money: true,
      values: lists.map((list) => {
        const hit = list.find((raw) => asObj(raw)?.contractorName === name);
        return num(asObj(hit)?.monthTotalRub);
      }),
    }));
    return (
      <div className="space-y-4">
        <MetricTable slots={slots} rows={rows} recon />
        {clinicRows.length > 0 ? (
          <MetricTable slots={slots} rows={clinicRows} recon />
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Нет строк сверок за эти месяцы.</p>
        )}
      </div>
    );
  }

  return (
    <p className="text-sm text-[var(--text-muted)]">Для этой вкладки сравнение не собрано.</p>
  );
}
