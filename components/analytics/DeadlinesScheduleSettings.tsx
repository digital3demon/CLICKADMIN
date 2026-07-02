"use client";

import { useEffect, useMemo, useState } from "react";
import { PrefixSearchCombobox } from "@/components/ui/PrefixSearchCombobox";
import {
  DEFAULT_DEADLINES_WEEKEND_DAYS,
  DEFAULT_WORK_END_HM,
  DEFAULT_WORK_START_HM,
  type DeadlinesScheduleConfig,
} from "@/lib/analytics/deadlines-schedule";
import {
  listProductionCalendarLocations,
  type ProductionCalendarLocation,
} from "@/lib/analytics/production-calendar-locations";
import { PRODUCTION_CALENDAR_COUNTRIES } from "@/lib/production-calendar";

const WEEKDAY_LABELS = [
  { d: 1, label: "Пн" },
  { d: 2, label: "Вт" },
  { d: 3, label: "Ср" },
  { d: 4, label: "Чт" },
  { d: 5, label: "Пт" },
  { d: 6, label: "Сб" },
  { d: 0, label: "Вс" },
] as const;

const inp =
  "h-9 w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 text-sm text-[var(--app-text)]";

const fieldLabel =
  "mb-1 block text-[0.68rem] font-medium text-[var(--text-muted)]";

export function DeadlinesScheduleSettings({
  schedule,
  onChange,
  mode,
  slaHours,
  onSlaHoursChange,
  onApply,
  applying,
}: {
  schedule: DeadlinesScheduleConfig;
  onChange: (next: DeadlinesScheduleConfig) => void;
  mode: "admin" | "work";
  slaHours?: number;
  onSlaHoursChange?: (hours: number) => void;
  onApply?: () => void;
  applying?: boolean;
}) {
  const [locations, setLocations] = useState<ProductionCalendarLocation[]>(() =>
    listProductionCalendarLocations(),
  );

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/analytics/deadlines/locations", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as {
          locations?: ProductionCalendarLocation[];
        };
        if (!cancelled && Array.isArray(data.locations)) {
          setLocations(data.locations);
        }
      })
      .catch(() => {
        /* локальный список */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const locationOptions = useMemo(
    () =>
      locations.map((row) => ({
        value: row.id,
        label: `${row.label} (${row.country})`,
        searchPrefixes: row.searchAliases,
      })),
    [locations],
  );

  const selectedRegion = schedule.regionId ?? "";

  function toggleWeekend(day: number) {
    const set = new Set(schedule.weekendDays);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    onChange({
      ...schedule,
      weekendDays:
        set.size > 0 ? Array.from(set).sort() : [...DEFAULT_DEADLINES_WEEKEND_DAYS],
    });
  }

  const footnote =
    mode === "admin"
      ? "От поступления работы до оформления наряда; погрешность ±30 мин. Период фильтруется по дате поступления."
      : "От оформления до «Сдана админам»; норматив — max leadWorkingDays из прайса. Период — по дате оформления. Погрешность ±30 мин.";

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-[var(--app-text)]">
        Рабочий календарь и часы
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
        Праздники страны + региональные даты; рабочее время в часовом поясе региона
        (по умолчанию Москва).
      </p>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.95fr)]">
        {/* Левая колонка: часы и выходные */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs">
              <span className={fieldLabel}>С</span>
              <input
                type="time"
                className={inp}
                value={schedule.workStartHm}
                onChange={(e) =>
                  onChange({
                    ...schedule,
                    workStartHm: e.target.value || DEFAULT_WORK_START_HM,
                  })
                }
              />
            </label>
            <label className="block text-xs">
              <span className={fieldLabel}>До</span>
              <input
                type="time"
                className={inp}
                value={schedule.workEndHm}
                onChange={(e) =>
                  onChange({
                    ...schedule,
                    workEndHm: e.target.value || DEFAULT_WORK_END_HM,
                  })
                }
              />
            </label>
          </div>
          <div>
            <div className={fieldLabel}>Выходные дни</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {WEEKDAY_LABELS.map(({ d, label }) => {
                const isOff = schedule.weekendDays.includes(d);
                return (
                  <label
                    key={d}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
                      isOff
                        ? "border-[var(--sidebar-blue)]/40 bg-[var(--sidebar-blue)]/10 text-[var(--app-text)]"
                        : "border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-[var(--sidebar-blue)]"
                      checked={isOff}
                      onChange={() => toggleWeekend(d)}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Центр: страна и регион */}
        <div className="space-y-3">
          <label className="block text-xs">
            <span className={fieldLabel}>Страна</span>
            <select
              className={inp}
              value={schedule.country}
              onChange={(e) =>
                onChange({
                  ...schedule,
                  country: e.target.value as typeof schedule.country,
                })
              }
            >
              {PRODUCTION_CALENDAR_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c === "RU" ? "Россия" : c === "BY" ? "Беларусь" : "Казахстан"}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className={fieldLabel}>Регион / город</span>
            <PrefixSearchCombobox
              options={locationOptions}
              value={selectedRegion}
              onChange={(id) => {
                const row = locations.find((x) => x.id === id);
                onChange({
                  ...schedule,
                  regionId: id || null,
                  country: row?.country ?? schedule.country,
                  timezone: row?.timezone ?? "Europe/Moscow",
                  extraHolidaysMmDd: row?.extraHolidaysMmDd ?? [],
                });
              }}
              placeholder="Москва, СПб…"
              emptyOptionLabel="Без региона"
              className="w-full"
            />
          </label>
        </div>

        {/* Правая колонка: порог (админ) или подсказка + применить */}
        <div className="flex flex-col">
          {mode === "admin" && slaHours != null && onSlaHoursChange ? (
            <label className="block text-xs">
              <span className={fieldLabel}>Порог занесения (рабочие часы)</span>
              <input
                type="number"
                min={0.5}
                max={72}
                step={0.5}
                className={inp}
                value={slaHours}
                onChange={(e) =>
                  onSlaHoursChange(Number(e.target.value) || slaHours)
                }
              />
            </label>
          ) : (
            <div className="text-xs font-medium text-[var(--text-muted)]">
              Параметры сроков работ
            </div>
          )}
          <button
            type="button"
            disabled={applying}
            className="mt-3 h-9 w-full rounded-lg bg-[var(--sidebar-blue)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            onClick={() => onApply?.()}
          >
            {applying ? "Загрузка…" : "Применить"}
          </button>
          <p className="mt-auto pt-3 text-[0.68rem] leading-relaxed text-[var(--text-muted)]">
            {footnote}
          </p>
        </div>
      </div>
    </div>
  );
}
