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
  "rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-sm text-[var(--app-text)]";

export function DeadlinesScheduleSettings({
  schedule,
  onChange,
}: {
  schedule: DeadlinesScheduleConfig;
  onChange: (next: DeadlinesScheduleConfig) => void;
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

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
      <h3 className="text-sm font-semibold text-[var(--app-text)]">
        Рабочий календарь и часы
      </h3>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        Праздники страны + региональные даты; рабочее время в часовом поясе региона
        (по умолчанию Москва).
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs">
          <span className="mb-1 block text-[var(--text-muted)]">Страна</span>
          <select
            className={`${inp} w-full`}
            value={schedule.country}
            onChange={(e) =>
              onChange({ ...schedule, country: e.target.value as typeof schedule.country })
            }
          >
            {PRODUCTION_CALENDAR_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c === "RU" ? "Россия" : c === "BY" ? "Беларусь" : "Казахстан"}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs sm:col-span-2">
          <span className="mb-1 block text-[var(--text-muted)]">
            Регион / город
          </span>
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
        <label className="block text-xs">
          <span className="mb-1 block text-[var(--text-muted)]">С</span>
          <input
            type="time"
            className={`${inp} w-full`}
            value={schedule.workStartHm}
            onChange={(e) =>
              onChange({ ...schedule, workStartHm: e.target.value || DEFAULT_WORK_START_HM })
            }
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block text-[var(--text-muted)]">До</span>
          <input
            type="time"
            className={`${inp} w-full`}
            value={schedule.workEndHm}
            onChange={(e) =>
              onChange({ ...schedule, workEndHm: e.target.value || DEFAULT_WORK_END_HM })
            }
          />
        </label>
      </div>
      <div className="mt-3">
        <div className="text-xs text-[var(--text-muted)]">Выходные дни</div>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map(({ d, label }) => {
            const isOff = schedule.weekendDays.includes(d);
            return (
              <label
                key={d}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-2 py-1 text-xs"
              >
                <input
                  type="checkbox"
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
  );
}
