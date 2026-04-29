"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function moneyRu(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(n);
}

export function DoctorFinancePanel({
  doctorId,
  allTimeTotalRub,
  allTimeLineCount,
  allTimeWithoutPrice,
  periodFrom,
  periodTo,
  periodTotalRub,
  periodLineCount,
  periodWithoutPrice,
}: {
  doctorId: string;
  allTimeTotalRub: number;
  allTimeLineCount: number;
  allTimeWithoutPrice: number;
  periodFrom: string;
  periodTo: string;
  periodTotalRub: number;
  periodLineCount: number;
  periodWithoutPrice: number;
}) {
  const [from, setFrom] = useState(periodFrom);
  const [to, setTo] = useState(periodTo);

  useEffect(() => {
    setFrom(periodFrom);
    setTo(periodTo);
  }, [periodFrom, periodTo]);

  const hrefBase = `/clients/doctors/${doctorId}`;
  const applyHref = useMemo(() => {
    const q = new URLSearchParams();
    q.set("tab", "finance");
    q.set("from", from);
    q.set("to", to);
    return `${hrefBase}?${q.toString()}`;
  }, [doctorId, from, to, hrefBase]);

  const xlsxHref = useMemo(() => {
    const q = new URLSearchParams();
    q.set("from", periodFrom);
    q.set("to", periodTo);
    return `/api/doctors/${doctorId}/reconciliation?${q.toString()}`;
  }, [doctorId, periodFrom, periodTo]);

  return (
    <section
      className="space-y-6"
      role="tabpanel"
      aria-label="Финансы"
    >
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Оборот
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Суммы по позициям нарядов этого врача (по всем клиникам и частным
          нарядам): количество × цена за единицу. Если цена не указана, в сумму
          позиция не входит (0 ₽).
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Всего за всё время
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-[var(--app-text)]">
              {moneyRu(allTimeTotalRub)}
            </dd>
            <dd className="mt-1 text-xs text-[var(--text-secondary)]">
              Позиций: {allTimeLineCount}
              {allTimeWithoutPrice > 0
                ? ` · без цены: ${allTimeWithoutPrice}`
                : null}
            </dd>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              За выбранный период
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-emerald-950">
              {moneyRu(periodTotalRub)}
            </dd>
            <dd className="mt-1 text-xs text-emerald-900/80">
              {periodFrom} — {periodTo} · позиций: {periodLineCount}
              {periodWithoutPrice > 0
                ? ` · без цены: ${periodWithoutPrice}`
                : null}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Период и сверка
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Укажите даты (календарные дни, UTC) и обновите обзор. Сверка выгружается
          в Excel по текущему выбранному периоду на странице.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]">
            С
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]">
            По
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
            />
          </label>
          <Link
            href={applyHref}
            scroll={false}
            className="inline-flex rounded-full bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          >
            Показать
          </Link>
          <a
            href={xlsxHref}
            className="inline-flex rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-strong)] hover:bg-[var(--card-bg)]"
          >
            Скачать сверку (xlsx)
          </a>
        </div>
      </div>
    </section>
  );
}
