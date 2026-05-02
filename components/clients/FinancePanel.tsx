"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LAB_WORK_STATUS_LABELS,
  LAB_WORK_STATUS_ORDER,
  type LabWorkStatus,
} from "@/lib/lab-work-status";

function moneyRu(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(n);
}

type ExcludedOrderRow = {
  id: string;
  orderNumber: string;
  doctorName: string;
  sumRub: number;
  postponedToNextPeriod: boolean;
};

type SnapshotRow = {
  id: string;
  slot: string;
  periodFromStr: string;
  periodToStr: string;
  periodLabelRu: string;
  legalEntityLabel: string;
  createdAt: string;
  dismissedAt: string | null;
};

function slotLabelRu(slot: string): string {
  if (slot === "FIRST_HALF") return "1-я половина месяца";
  if (slot === "SECOND_HALF") return "2-я половина месяца";
  if (slot === "MONTHLY_FULL") return "Весь месяц";
  return slot;
}

type PeriodLineRow = {
  orderId: string;
  clinicName: string;
  doctorName: string;
  patientName: string | null;
  orderCreatedAt: string;
  workReceivedAt: string | null;
  approvedAt: string | null;
  sentAt: string | null;
  orderNumber: string;
  labWorkStatus: string;
  attentionRequired: boolean;
  description: string;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number;
};

function formatDateOnlyRu(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isKnownLabWorkStatus(value: string): value is LabWorkStatus {
  return (LAB_WORK_STATUS_ORDER as readonly string[]).includes(value);
}

export function FinancePanel({
  clinicId,
  worksWithReconciliation,
  allTimeTotalRub,
  allTimeLineCount,
  allTimeWithoutPrice,
  periodFrom,
  periodTo,
  periodTotalRub,
  periodLineCount,
  periodWithoutPrice,
}: {
  clinicId: string;
  worksWithReconciliation: boolean;
  allTimeTotalRub: number;
  allTimeLineCount: number;
  allTimeWithoutPrice: number;
  periodFrom: string;
  periodTo: string;
  periodTotalRub: number;
  periodLineCount: number;
  periodWithoutPrice: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processedReconSnapshotId = useRef<string | null>(null);

  const [from, setFrom] = useState(periodFrom);
  const [to, setTo] = useState(periodTo);

  useEffect(() => {
    setFrom(periodFrom);
    setTo(periodTo);
  }, [periodFrom, periodTo]);

  const [excludedOrders, setExcludedOrders] = useState<ExcludedOrderRow[]>([]);
  const [periodEndIso, setPeriodEndIso] = useState<string | null>(null);
  const [exclusionsLoading, setExclusionsLoading] = useState(false);
  const [exclusionsError, setExclusionsError] = useState<string | null>(null);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  const [periodLines, setPeriodLines] = useState<PeriodLineRow[]>([]);
  const [periodLinesLoading, setPeriodLinesLoading] = useState(false);
  const [periodLinesError, setPeriodLinesError] = useState<string | null>(null);
  const [bulkExcluding, setBulkExcluding] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LabWorkStatus | "ALL">("ALL");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  useEffect(() => {
    const rid = searchParams.get("reconSnapshot")?.trim();
    if (!rid) return;
    if (processedReconSnapshotId.current === rid) return;
    processedReconSnapshotId.current = rid;
    (async () => {
      try {
        await fetch(`/api/reconciliation-snapshots/${encodeURIComponent(rid)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dismissed: true }),
        });
      } catch {
        /* ignore */
      }
      const q = new URLSearchParams(searchParams.toString());
      q.delete("reconSnapshot");
      const qs = q.toString();
      router.replace(`/clients/${clinicId}${qs ? `?${qs}` : ""}`, {
        scroll: false,
      });
    })();
  }, [searchParams, router, clinicId]);

  const loadSnapshots = useCallback(async () => {
    if (!worksWithReconciliation) {
      setSnapshots([]);
      return;
    }
    setSnapshotsLoading(true);
    try {
      const res = await fetch(
        `/api/clinics/${clinicId}/reconciliation-snapshots`,
        { cache: "no-store" },
      );
      const j = (await res.json().catch(() => ({}))) as {
        snapshots?: SnapshotRow[];
      };
      setSnapshots(Array.isArray(j.snapshots) ? j.snapshots : []);
    } catch {
      setSnapshots([]);
    } finally {
      setSnapshotsLoading(false);
    }
  }, [clinicId, worksWithReconciliation]);

  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  const loadPeriodLines = useCallback(async () => {
    setPeriodLinesLoading(true);
    setPeriodLinesError(null);
    try {
      const q = new URLSearchParams({
        from: periodFrom,
        to: periodTo,
      });
      const res = await fetch(
        `/api/clinics/${clinicId}/reconciliation-lines?${q.toString()}`,
        { cache: "no-store" },
      );
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        included?: PeriodLineRow[];
      };
      if (!res.ok) {
        setPeriodLinesError(j.error ?? "Не удалось загрузить позиции");
        setPeriodLines([]);
        return;
      }
      setPeriodLines(Array.isArray(j.included) ? j.included : []);
    } catch {
      setPeriodLinesError("Сеть или сервер недоступны");
      setPeriodLines([]);
    } finally {
      setPeriodLinesLoading(false);
    }
  }, [clinicId, periodFrom, periodTo]);

  useEffect(() => {
    void loadPeriodLines();
  }, [loadPeriodLines]);

  useEffect(() => {
    const present = new Set(periodLines.map((r) => r.orderId));
    setSelectedOrderIds((prev) => prev.filter((id) => present.has(id)));
  }, [periodLines]);

  const visiblePeriodLines = useMemo(() => {
    return periodLines.filter((row) => {
      if (
        statusFilter !== "ALL" &&
        row.labWorkStatus !== statusFilter
      ) {
        return false;
      }
      if (attentionOnly && !row.attentionRequired) {
        return false;
      }
      return true;
    });
  }, [periodLines, statusFilter, attentionOnly]);

  const visibleOrderIds = useMemo(
    () => Array.from(new Set(visiblePeriodLines.map((r) => r.orderId))),
    [visiblePeriodLines],
  );

  const allVisibleSelected =
    visibleOrderIds.length > 0 &&
    visibleOrderIds.every((id) => selectedOrderIds.includes(id));
  const anyVisibleSelected = visibleOrderIds.some((id) =>
    selectedOrderIds.includes(id),
  );

  const statusCounts = useMemo(() => {
    const m = new Map<LabWorkStatus, number>();
    for (const st of LAB_WORK_STATUS_ORDER) m.set(st, 0);
    for (const row of periodLines) {
      if (isKnownLabWorkStatus(row.labWorkStatus)) {
        const k = row.labWorkStatus;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
    }
    return m;
  }, [periodLines]);

  const loadExclusions = useCallback(async () => {
    if (!worksWithReconciliation) {
      setExcludedOrders([]);
      setPeriodEndIso(null);
      setExclusionsError(null);
      return;
    }
    setExclusionsLoading(true);
    setExclusionsError(null);
    try {
      const q = new URLSearchParams({ from, to });
      const res = await fetch(
        `/api/clinics/${clinicId}/reconciliation-exclusions?${q.toString()}`,
        { cache: "no-store" },
      );
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        orders?: ExcludedOrderRow[];
        periodEndIso?: string;
      };
      if (!res.ok) {
        setExclusionsError(j.error ?? "Не удалось загрузить исключения");
        setExcludedOrders([]);
        setPeriodEndIso(null);
        return;
      }
      setExcludedOrders(Array.isArray(j.orders) ? j.orders : []);
      setPeriodEndIso(
        typeof j.periodEndIso === "string" ? j.periodEndIso : null,
      );
    } catch {
      setExclusionsError("Сеть или сервер недоступны");
      setExcludedOrders([]);
      setPeriodEndIso(null);
    } finally {
      setExclusionsLoading(false);
    }
  }, [clinicId, from, to, worksWithReconciliation]);

  useEffect(() => {
    void loadExclusions();
  }, [loadExclusions]);

  /** Конец выбранного периода (UTC), как в API сверки — для excludeUntil. */
  const periodEndIsoForShownRange = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(periodTo.trim());
    if (!m) return null;
    return new Date(
      Date.UTC(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        23,
        59,
        59,
        999,
      ),
    ).toISOString();
  }, [periodTo]);

  const excludeAllInPeriodFromTable = useCallback(async () => {
    if (!worksWithReconciliation || !periodEndIsoForShownRange) return;
    const ids = [...new Set(visiblePeriodLines.map((r) => r.orderId))];
    if (ids.length === 0) return;
    const ok = window.confirm(
      `Убрать из сверки за период ${periodFrom} — ${periodTo} все наряды из таблицы (${ids.length} шт.)? Они появятся в сверке снова в следующих периодах.`,
    );
    if (!ok) return;
    setBulkExcluding(true);
    setExclusionsError(null);
    try {
      for (const orderId of ids) {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            excludeFromReconciliation: true,
            excludeFromReconciliationUntil: periodEndIsoForShownRange,
          }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setExclusionsError(j.error ?? `Не удалось обновить наряд ${orderId}`);
          break;
        }
      }
      await loadExclusions();
      await loadSnapshots();
      await loadPeriodLines();
      router.refresh();
    } catch {
      setExclusionsError("Сеть или сервер недоступны");
    } finally {
      setBulkExcluding(false);
    }
  }, [
    worksWithReconciliation,
    periodEndIsoForShownRange,
    visiblePeriodLines,
    periodFrom,
    periodTo,
    loadExclusions,
    loadSnapshots,
    loadPeriodLines,
    router,
  ]);

  const patchOrderExclusion = useCallback(
    async (
      orderId: string,
      body: Record<string, unknown>,
    ): Promise<boolean> => {
      setActionOrderId(orderId);
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setExclusionsError(j.error ?? "Не удалось сохранить");
          return false;
        }
        await loadExclusions();
        await loadSnapshots();
        await loadPeriodLines();
        router.refresh();
        return true;
      } catch {
        setExclusionsError("Сеть или сервер недоступны");
        return false;
      } finally {
        setActionOrderId(null);
      }
    },
    [loadExclusions, loadSnapshots, loadPeriodLines, router],
  );

  const hrefBase = `/clients/${clinicId}`;
  const applyHref = useMemo(() => {
    const q = new URLSearchParams();
    q.set("tab", "finance");
    q.set("from", from);
    q.set("to", to);
    return `${hrefBase}?${q.toString()}`;
  }, [clinicId, from, to, hrefBase]);

  const applyPeriod = useCallback(() => {
    router.push(applyHref);
    router.refresh();
  }, [router, applyHref]);

  const xlsxHref = useMemo(() => {
    const q = new URLSearchParams();
    q.set("from", from);
    q.set("to", to);
    if (selectedOrderIds.length > 0) {
      q.set("orderIds", selectedOrderIds.join(","));
    }
    return `/api/clinics/${clinicId}/reconciliation?${q.toString()}`;
  }, [clinicId, from, to, selectedOrderIds]);

  const pdfHref = useMemo(() => {
    const q = new URLSearchParams();
    q.set("from", from);
    q.set("to", to);
    if (selectedOrderIds.length > 0) {
      q.set("orderIds", selectedOrderIds.join(","));
    }
    return `/api/clinics/${clinicId}/reconciliation-pdf?${q.toString()}`;
  }, [clinicId, from, to, selectedOrderIds]);

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
          Суммы по позициям нарядов: количество × цена за единицу. Если цена не
          указана, в сумму позиция не входит (0 ₽).
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
          Укажите даты (календарные дни, UTC) и нажмите «Показать» — обновятся
          суммы в блоке «Оборот» выше и таблица позиций ниже. Выгрузка в формате
          образца — PDF; Excel — как раньше (в т.ч. лист «Исключено из сверки»,
          если есть такие наряды).
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
          <button
            type="button"
            onClick={() => void applyPeriod()}
            className="inline-flex rounded-full bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          >
            Показать
          </button>
          <a
            href={pdfHref}
            className="inline-flex rounded-full border border-[var(--card-border)] bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          >
            Скачать сверку (PDF)
          </a>
          <a
            href={xlsxHref}
            className="inline-flex rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-strong)] hover:bg-[var(--card-bg)]"
          >
            Скачать сверку (xlsx)
          </a>
        </div>

        <div className="mt-6 border-t border-[var(--card-border)] pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Позиции за период ({periodFrom} — {periodTo})
            </h3>
            {worksWithReconciliation &&
            periodLines.length > 0 &&
            periodEndIsoForShownRange ? (
              <button
                type="button"
                disabled={bulkExcluding || periodLinesLoading}
                onClick={() => void excludeAllInPeriodFromTable()}
                className="inline-flex shrink-0 rounded-full border border-amber-300/80 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-500/25 disabled:opacity-50 dark:border-amber-700/80 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/55"
              >
                {bulkExcluding
                  ? "Обновление…"
                  : "Убрать из сверки за период"}
              </button>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                statusFilter === "ALL"
                  ? "bg-[var(--sidebar-blue)] text-white"
                  : "border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-strong)]"
              }`}
            >
              Все статусы ({periodLines.length})
            </button>
            {LAB_WORK_STATUS_ORDER.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  statusFilter === st
                    ? "bg-[var(--sidebar-blue)] text-white"
                    : "border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-strong)]"
                }`}
              >
                {LAB_WORK_STATUS_LABELS[st]} ({statusCounts.get(st) ?? 0})
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAttentionOnly((v) => !v)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                attentionOnly
                  ? "bg-amber-500 text-amber-950"
                  : "border border-amber-300 bg-amber-50 text-amber-900"
              }`}
              title="Фильтр по работам с признаком внимания"
            >
              ▲ Внимание
            </button>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Те же строки, что в основном листе выгрузки сверки (без исключённых
            из сверки нарядов). Кнопки «Убрать из сверки» и «Перенести на
            следующий период» действуют на весь наряд: если позиций несколько,
            меняется статус наряда целиком.
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Выбрано для выгрузки: {selectedOrderIds.length}{" "}
            {selectedOrderIds.length === 1 ? "наряд" : "нарядов"}.
          </p>
          {periodLinesError ? (
            <p className="mt-2 text-sm text-red-700">{periodLinesError}</p>
          ) : null}
          {periodLinesLoading ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">Загрузка…</p>
          ) : visiblePeriodLines.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Нет строк по текущему фильтру статуса/внимания.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--card-border)]">
              <table className="w-full min-w-[1340px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    <th className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        ref={(el) => {
                          if (!el) return;
                          el.indeterminate = !allVisibleSelected && anyVisibleSelected;
                        }}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrderIds((prev) =>
                              Array.from(new Set([...prev, ...visibleOrderIds])),
                            );
                          } else {
                            const hidden = new Set(visibleOrderIds);
                            setSelectedOrderIds((prev) =>
                              prev.filter((id) => !hidden.has(id)),
                            );
                          }
                        }}
                        title="Выбрать все видимые наряды"
                      />
                    </th>
                    <th className="px-3 py-2">Наряд</th>
                    <th className="px-3 py-2">Клиника</th>
                    <th className="px-3 py-2">Доктор</th>
                    <th className="px-3 py-2">Пациент</th>
                    <th className="px-3 py-2">Работа зашла</th>
                    <th className="px-3 py-2">Согласовано</th>
                    <th className="px-3 py-2">Отправка</th>
                    <th className="px-3 py-2">Позиция</th>
                    <th className="px-3 py-2 text-right">Кол-во</th>
                    <th className="px-3 py-2 text-right">Цена</th>
                    <th className="px-3 py-2 text-right">Сумма</th>
                    {worksWithReconciliation ? (
                      <th className="px-3 py-2">Действия</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {visiblePeriodLines.map((row, idx) => {
                    const busy = actionOrderId === row.orderId;
                    const checked = selectedOrderIds.includes(row.orderId);
                    return (
                      <tr
                        key={`${row.orderId}-${idx}`}
                        className="border-b border-[var(--border-subtle)] last:border-0"
                      >
                        <td className="px-3 py-2 align-top">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds((prev) =>
                                  prev.includes(row.orderId)
                                    ? prev
                                    : [...prev, row.orderId],
                                );
                              } else {
                                setSelectedOrderIds((prev) =>
                                  prev.filter((id) => id !== row.orderId),
                                );
                              }
                            }}
                            title="Добавить наряд в сверку/выгрузку"
                          />
                        </td>
                        <td className="px-3 py-2 font-medium">
                          <div className="flex items-center gap-1">
                            {row.attentionRequired ? (
                              <span
                                className="text-[11px] text-amber-600"
                                title="Требуется внимание"
                              >
                                ▲
                              </span>
                            ) : null}
                            <Link
                              href={`/orders/${row.orderId}`}
                              className="text-[var(--sidebar-blue)] hover:underline"
                            >
                              {row.orderNumber}
                            </Link>
                          </div>
                          <div className="mt-1">
                            <span className="rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                              {isKnownLabWorkStatus(row.labWorkStatus)
                                ? LAB_WORK_STATUS_LABELS[row.labWorkStatus]
                                : row.labWorkStatus}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[var(--text-body)]">
                          {row.clinicName}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-body)]">
                          {row.doctorName}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-body)]">
                          {row.patientName || "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-[var(--text-secondary)]">
                          {formatDateOnlyRu(
                            row.workReceivedAt ?? row.orderCreatedAt,
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-[var(--text-secondary)]">
                          {formatDateOnlyRu(row.approvedAt)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-[var(--text-secondary)]">
                          {formatDateOnlyRu(row.sentAt)}
                        </td>
                        <td className="max-w-[280px] px-3 py-2 text-xs text-[var(--text-body)]">
                          {row.description}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.quantity}
                        </td>
                        <td className="px-3 py-2 text-right text-xs tabular-nums text-[var(--text-secondary)]">
                          {row.unitPrice == null ? "—" : moneyRu(row.unitPrice)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">
                          {moneyRu(row.lineTotal)}
                        </td>
                        {worksWithReconciliation ? (
                          <td className="px-3 py-2 align-top">
                            <div className="flex max-w-[14rem] flex-col gap-1.5 sm:max-w-none sm:flex-row sm:flex-wrap">
                              <button
                                type="button"
                                disabled={busy}
                                title="Исключить наряд из сверки до ручного возврата (все позиции наряда)"
                                onClick={() => {
                                  const ok = window.confirm(
                                    "Исключить наряд из сверки без даты окончания? Все позиции этого наряда пропадут из сверки, пока не вернёте наряд вручную во «Финансах».",
                                  );
                                  if (!ok) return;
                                  void patchOrderExclusion(row.orderId, {
                                    excludeFromReconciliation: true,
                                    excludeFromReconciliationUntil: null,
                                  });
                                }}
                                className="whitespace-nowrap rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-left text-[0.65rem] font-semibold leading-tight text-[var(--text-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50 sm:text-xs"
                              >
                                Убрать из сверки
                              </button>
                              <button
                                type="button"
                                disabled={
                                  busy || !periodEndIsoForShownRange
                                }
                                title={
                                  !periodEndIsoForShownRange
                                    ? "Задайте корректный период «По»"
                                    : "Не включать наряд в сверку за этот период; в следующих периодах снова учитывать"
                                }
                                onClick={() => {
                                  const ok = window.confirm(
                                    "Перенести наряд на следующий период сверки? Все позиции этого наряда не попадут в выгрузку за выбранные даты и снова появятся при следующем периоде.",
                                  );
                                  if (!ok) return;
                                  void patchOrderExclusion(row.orderId, {
                                    excludeFromReconciliation: true,
                                    excludeFromReconciliationUntil:
                                      periodEndIsoForShownRange,
                                  });
                                }}
                                className="whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-left text-[0.65rem] font-semibold leading-tight text-amber-950 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800/80 dark:bg-amber-950/35 dark:text-amber-100 dark:hover:bg-amber-950/50 sm:text-xs"
                              >
                                Перенести на следующий период
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {worksWithReconciliation ? (
          <div className="mt-6 border-t border-[var(--card-border)] pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Автосверки (по расписанию)
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Файлы, сформированные в конце периода (МСК, рабочие дни). Дубликаты
              за тот же период не создаются.
            </p>
            {snapshotsLoading ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">Загрузка…</p>
            ) : snapshots.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Пока нет сохранённых автосверок.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {snapshots.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--app-text)]">
                        {s.periodLabelRu}{" "}
                        <span className="text-xs font-normal text-[var(--text-muted)]">
                          ({slotLabelRu(s.slot)})
                        </span>
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {s.legalEntityLabel} ·{" "}
                        {new Date(s.createdAt).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {s.dismissedAt ? " · уведомление скрыто" : ""}
                      </p>
                    </div>
                    <a
                      href={`/api/reconciliation-snapshots/${s.id}`}
                      className="shrink-0 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-semibold text-[var(--sidebar-blue)] hover:bg-[var(--surface-hover)]"
                    >
                      Скачать
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {worksWithReconciliation ? (
          <div className="mt-6 border-t border-[var(--card-border)] pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Исключено из основной сверки за период
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Наряды с оплатой «СВЕРКА», по которым отмечено исключение из сверки
              или перенос на следующий период. Их суммы уже учтены в обороте
              выше; в файле сверки они на отдельном листе. Здесь можно вернуть
              наряд в сверку за периоды или оставить исключение до следующего
              периода выгрузки.
            </p>
            {exclusionsError ? (
              <p className="mt-2 text-sm text-red-700">{exclusionsError}</p>
            ) : null}
            {exclusionsLoading ? (
              <p className="mt-3 text-sm text-[var(--text-muted)]">Загрузка…</p>
            ) : excludedOrders.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                За выбранные даты таких нарядов нет.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--card-border)]">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                      <th className="px-3 py-2">Наряд</th>
                      <th className="px-3 py-2">Врач</th>
                      <th className="px-3 py-2 text-right">Сумма</th>
                      <th className="px-3 py-2">Статус</th>
                      <th className="px-3 py-2">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excludedOrders.map((o) => {
                      const busy = actionOrderId === o.id;
                      return (
                        <tr
                          key={o.id}
                          className="border-b border-[var(--border-subtle)] last:border-0"
                        >
                          <td className="px-3 py-2 font-medium">
                            <Link
                              href={`/orders/${o.id}`}
                              className="text-[var(--sidebar-blue)] hover:underline"
                            >
                              {o.orderNumber}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-[var(--text-body)]">
                            {o.doctorName}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {moneyRu(o.sumRub)}
                          </td>
                          <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                            {o.postponedToNextPeriod
                              ? "Перенос на следующий период"
                              : "Исключено из сверки"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void patchOrderExclusion(o.id, {
                                    excludeFromReconciliation: false,
                                  })
                                }
                                className="rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--text-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                              >
                                Включить в сверку
                              </button>
                              <button
                                type="button"
                                disabled={busy || !periodEndIso}
                                title={
                                  !periodEndIso
                                    ? "Нет границы периода"
                                    : undefined
                                }
                                onClick={() =>
                                  void patchOrderExclusion(o.id, {
                                    excludeFromReconciliation: true,
                                    excludeFromReconciliationUntil: periodEndIso,
                                  })
                                }
                                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                              >
                                В следующий период
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
