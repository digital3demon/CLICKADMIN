"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  COMPARE_PERIOD_COLORS,
  MAX_COMPARE_PERIODS,
  monthTitleRu,
  newCompareSlotId,
  prevCalendarMonth,
  shiftYmdRangeBack,
  type ComparePeriodSlot,
} from "@/lib/analytics/compare-periods";
import { currentMskMonthYmdRange } from "@/lib/analytics/range";
import { AnalyticsCompareResults } from "@/components/analytics/AnalyticsCompareResults";

const TAB_LABELS: Record<string, string> = {
  finance: "Финансы",
  rework: "Переделки",
  production: "Производство",
  price: "Позиции прайса",
  contractors: "Клиники и врачи",
  warehouse: "Склад",
  deadlines: "Сроки",
  reconciliation: "Сверки",
};

function reportPath(tab: string, slot: ComparePeriodSlot): string {
  const q = `from=${encodeURIComponent(slot.from)}&to=${encodeURIComponent(slot.to)}`;
  if (tab === "finance" || tab === "rework") return `/api/analytics/finance?${q}`;
  if (tab === "price") return `/api/analytics/price-items?${q}`;
  if (tab === "contractors") return `/api/analytics/contractors?${q}`;
  if (tab === "warehouse") return `/api/analytics/warehouse?${q}`;
  if (tab === "production") return `/api/analytics/production?${q}`;
  if (tab === "deadlines") return `/api/analytics/deadlines/admin?${q}`;
  return `/api/analytics/reconciliation?year=${slot.year}&month=${slot.month}`;
}

async function loadJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const trimmed = text.trim();
  let j: unknown = null;
  if (trimmed) {
    try {
      j = JSON.parse(trimmed) as unknown;
    } catch {
      throw new Error(res.ok ? "Неверный ответ сервера" : `Ошибка ${res.status}`);
    }
  }
  if (!res.ok) {
    const err =
      typeof j === "object" && j !== null && "error" in j
        ? String((j as { error?: string }).error ?? "")
        : "";
    throw new Error(err || `Ошибка ${res.status}`);
  }
  return j;
}

function seedSlots(args: {
  tab: string;
  fromStr: string;
  toStr: string;
  reconYear: number;
  reconMonth: number;
}): ComparePeriodSlot[] {
  if (args.tab === "reconciliation") {
    const prev = prevCalendarMonth(args.reconYear, args.reconMonth);
    return [
      {
        id: newCompareSlotId(),
        from: "",
        to: "",
        year: args.reconYear,
        month: args.reconMonth,
      },
      {
        id: newCompareSlotId(),
        from: "",
        to: "",
        year: prev.year,
        month: prev.month,
      },
    ];
  }
  const back = shiftYmdRangeBack(args.fromStr, args.toStr) ?? currentMskMonthYmdRange();
  return [
    {
      id: newCompareSlotId(),
      from: args.fromStr,
      to: args.toStr,
      year: 0,
      month: 0,
    },
    {
      id: newCompareSlotId(),
      from: back.from,
      to: back.to,
      year: 0,
      month: 0,
    },
  ];
}

export function AnalyticsCompareModal({
  tab,
  fromStr,
  toStr,
  reconYear,
  reconMonth,
  onClose,
}: {
  tab: string;
  fromStr: string;
  toStr: string;
  reconYear: number;
  reconMonth: number;
  onClose: () => void;
}) {
  const titleId = useId();
  const recon = tab === "reconciliation";
  const [slots, setSlots] = useState<ComparePeriodSlot[]>(() =>
    seedSlots({ tab, fromStr, toStr, reconYear, reconMonth }),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payloads, setPayloads] = useState<unknown[] | null>(null);
  const [dirty, setDirty] = useState(false);

  const runCompare = useCallback(async (nextSlots: ComparePeriodSlot[]) => {
    if (nextSlots.some((s) => (recon ? !s.year || !s.month : !s.from || !s.to))) {
      setError("Заполните даты у каждого периода");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await Promise.all(nextSlots.map((s) => loadJson(reportPath(tab, s))));
      setPayloads(data);
      setDirty(false);
    } catch (e) {
      setPayloads(null);
      setError(e instanceof Error ? e.message : "Не удалось сравнить периоды");
    } finally {
      setLoading(false);
    }
  }, [recon, tab]);

  useEffect(() => {
    void runCompare(slots);
    // один раз при открытии с начальными периодами
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function patchSlot(id: string, patch: Partial<ComparePeriodSlot>) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setDirty(true);
  }

  function addPeriod() {
    const last = slots[slots.length - 1];
    if (!last || slots.length >= MAX_COMPARE_PERIODS) return;
    let next: ComparePeriodSlot;
    if (recon) {
      const p = prevCalendarMonth(last.year, last.month);
      next = { id: newCompareSlotId(), from: "", to: "", year: p.year, month: p.month };
    } else {
      const back = shiftYmdRangeBack(last.from, last.to) ?? { from: last.from, to: last.to };
      next = { id: newCompareSlotId(), from: back.from, to: back.to, year: 0, month: 0 };
    }
    setSlots((prev) => [...prev, next]);
    setDirty(true);
  }

  const yearOptions = (() => {
    const y = new Date().getUTCFullYear();
    return [y - 2, y - 1, y, y + 1];
  })();

  return (
    <div
      className="fixed inset-0 z-[520] flex items-stretch justify-center bg-zinc-950/55 p-3 backdrop-blur-[2px] sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-full max-h-[min(920px,94vh)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--app-bg)] shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Сравнение периодов
            </p>
            <h2 id={titleId} className="mt-0.5 text-lg font-semibold text-[var(--app-text)]">
              {TAB_LABELS[tab] ?? "Аналитика"}
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-[var(--text-secondary)]">
              Сравните одни и те же цифры за два и больше отрезка. Первый период —
              тот, что был на экране. Добавьте ещё, если нужно три и больше.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--card-border)] px-2.5 py-1 text-sm text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </header>

        <div className="shrink-0 space-y-3 border-b border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            {slots.map((slot, i) => (
              <div
                key={slot.id}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: COMPARE_PERIOD_COLORS[i] }}
                    />
                    Период {i + 1}
                    {recon ? (
                      <span className="font-normal text-[var(--text-muted)]">
                        · {monthTitleRu(slot.year, slot.month)}
                      </span>
                    ) : null}
                  </span>
                  {slots.length > 2 ? (
                    <button
                      type="button"
                      className="text-[11px] text-[var(--text-muted)] hover:text-rose-600"
                      onClick={() => {
                        setSlots((prev) => prev.filter((s) => s.id !== slot.id));
                        setDirty(true);
                      }}
                    >
                      убрать
                    </button>
                  ) : null}
                </div>
                {recon ? (
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={slot.month}
                      onChange={(e) =>
                        patchSlot(slot.id, { month: Number(e.target.value) })
                      }
                      className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
                    >
                      {Array.from({ length: 12 }, (_, m) => m + 1).map((m) => (
                        <option key={m} value={m}>
                          {monthTitleRu(2026, m).replace(" 2026", "")}
                        </option>
                      ))}
                    </select>
                    <select
                      value={slot.year}
                      onChange={(e) =>
                        patchSlot(slot.id, { year: Number(e.target.value) })
                      }
                      className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-0.5 text-[11px] text-[var(--text-muted)]">
                      С
                      <input
                        type="date"
                        value={slot.from}
                        onChange={(e) => patchSlot(slot.id, { from: e.target.value })}
                        className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm text-[var(--app-text)]"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5 text-[11px] text-[var(--text-muted)]">
                      По
                      <input
                        type="date"
                        value={slot.to}
                        onChange={(e) => patchSlot(slot.id, { to: e.target.value })}
                        className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm text-[var(--app-text)]"
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={slots.length >= MAX_COMPARE_PERIODS}
              onClick={addPeriod}
              className="rounded-full border border-dashed border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
            >
              Добавить период
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void runCompare(slots)}
              className="rounded-md bg-[var(--sidebar-blue)] px-4 py-1.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              {loading ? "Считаем…" : payloads ? "Обновить сравнение" : "Сравнить"}
            </button>
            {dirty && !loading ? (
              <span className="text-xs text-[var(--text-muted)]">
                Периоды изменились — нажмите «Сравнить»
              </span>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
              {error}
            </div>
          ) : null}
          {loading && !payloads ? (
            <p className="text-sm text-[var(--text-muted)]">Загружаем отчёты по периодам…</p>
          ) : null}
          {payloads && !dirty ? (
            <AnalyticsCompareResults tab={tab} slots={slots} payloads={payloads} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
