"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShipmentsStickersPrintButton } from "@/components/shipments/ShipmentsStickersPrintButton";
import {
  ShipmentsStickersSheet,
  type StickerRow,
} from "@/components/shipments/ShipmentsStickersSheet";

const W_MIN = 25;
const W_MAX = 120;
const H_MIN = 20;
const H_MAX = 100;
const UNDO_VISIBLE_MS = 120_000;

type BulkMarkResponse = {
  ok?: boolean;
  error?: string;
  changed?: number;
  changedOrderIds?: string[];
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function parseMm(raw: string, fallback: number, lo: number, hi: number): number {
  const n = Number.parseInt(String(raw).replace(/\s/g, ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, lo, hi);
}

export function ShipmentsStickersPrintToolbar({
  rows,
  backHref,
}: {
  rows: StickerRow[];
  backHref: string;
}) {
  const [otherSize, setOtherSize] = useState(false);
  const [widthMm, setWidthMm] = useState(58);
  const [heightMm, setHeightMm] = useState(40);
  const [widthInput, setWidthInput] = useState("58");
  const [heightInput, setHeightInput] = useState("40");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<{
    ids: string[];
    count: number;
  } | null>(null);

  const orderIds = useMemo(() => rows.map((r) => r.id), [rows]);

  const applyParsed = useCallback(() => {
    const nw = parseMm(widthInput, widthMm, W_MIN, W_MAX);
    const nh = parseMm(heightInput, heightMm, H_MIN, H_MAX);
    setWidthMm(nw);
    setHeightMm(nh);
    setWidthInput(String(nw));
    setHeightInput(String(nh));
  }, [widthInput, heightInput, widthMm, heightMm]);

  const hint = useMemo(() => {
    const r = widthMm / heightMm;
    if (r >= 1.32) {
      return "При таком соотношении сторон врач и пациент выводятся в одну строку.";
    }
    return "Внизу слева компактный QR и «Отсканируй меня», справа — крупный логотип.";
  }, [widthMm, heightMm]);

  const layoutNote = useMemo(() => {
    const r = widthMm / heightMm;
    const wide = r >= 1.32;
    return `Текущий макет: ${widthMm}×${heightMm} мм${wide ? " · врач и пациент в ряд" : ""}.`;
  }, [widthMm, heightMm]);

  useEffect(() => {
    if (!undoState) return;
    const timer = window.setTimeout(() => setUndoState(null), UNDO_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [undoState]);

  const postBulkShipped = useCallback(
    async (ids: string[], shipped: boolean): Promise<BulkMarkResponse> => {
      const res = await fetch("/api/shipments/mark-shipped", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: ids, shipped }),
      });
      const data = (await res.json().catch(() => ({}))) as BulkMarkResponse;
      if (!res.ok || data.ok !== true) {
        throw new Error(data.error || "Не удалось обновить отметки отправки");
      }
      return data;
    },
    [],
  );

  const markPrintedShipments = useCallback(async () => {
    setBulkBusy(true);
    setBulkError(null);
    try {
      const data = await postBulkShipped(orderIds, true);
      const changedIds = Array.isArray(data.changedOrderIds)
        ? data.changedOrderIds.filter(Boolean)
        : [];
      setConfirmOpen(false);
      if (changedIds.length > 0) {
        setUndoState({ ids: changedIds, count: data.changed ?? changedIds.length });
      } else {
        setUndoState(null);
      }
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : "Не удалось обновить отметки отправки");
    } finally {
      setBulkBusy(false);
    }
  }, [orderIds, postBulkShipped]);

  const undoMarkPrintedShipments = useCallback(async () => {
    if (!undoState || undoState.ids.length === 0) return;
    setBulkBusy(true);
    setBulkError(null);
    try {
      await postBulkShipped(undoState.ids, false);
      setUndoState(null);
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : "Не удалось отменить отметки отправки");
    } finally {
      setBulkBusy(false);
    }
  }, [postBulkShipped, undoState]);

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <Link
          href={backHref}
          className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
        >
          ← К отгрузкам
        </Link>
        <ShipmentsStickersPrintButton
          onAfterPrint={() => {
            if (orderIds.length > 0) setConfirmOpen(true);
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (otherSize) {
              setWidthMm(58);
              setHeightMm(40);
              setWidthInput("58");
              setHeightInput("40");
            }
            setOtherSize((v) => !v);
          }}
          className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
        >
          {otherSize ? "Стандартный размер 58×40" : "Другой размер"}
        </button>
        {otherSize ? (
          <div className="flex flex-wrap items-end gap-3 border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-2 rounded-md">
            <label className="flex flex-col gap-0.5 text-xs text-[var(--text-secondary)]">
              Ширина, мм
              <input
                type="number"
                min={W_MIN}
                max={W_MAX}
                value={widthInput}
                onChange={(e) => setWidthInput(e.target.value)}
                onBlur={applyParsed}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyParsed();
                }}
                className="w-24 rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-sm text-[var(--text-strong)]"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs text-[var(--text-secondary)]">
              Высота, мм
              <input
                type="number"
                min={H_MIN}
                max={H_MAX}
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                onBlur={applyParsed}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyParsed();
                }}
                className="w-24 rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-sm text-[var(--text-strong)]"
              />
            </label>
            <button
              type="button"
              onClick={applyParsed}
              className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-95"
            >
              Применить
            </button>
          </div>
        ) : null}
      </div>
      {bulkError ? (
        <p className="no-print mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/35 dark:text-red-100">
          {bulkError}
        </p>
      ) : null}
      <p className="no-print mb-2 text-xs text-[var(--text-secondary)]">{layoutNote}</p>
      {otherSize ? (
        <p className="no-print mb-3 max-w-2xl text-xs text-[var(--text-secondary)]">{hint}</p>
      ) : null}
      <ShipmentsStickersSheet rows={rows} widthMm={widthMm} heightMm={heightMm} />
      {confirmOpen ? (
        <div
          className="no-print fixed inset-0 z-[240] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shipments-mark-shipped-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-2xl">
            <h2
              id="shipments-mark-shipped-title"
              className="text-base font-semibold text-[var(--text-strong)]"
            >
              Отметить работы как отправленные?
            </h2>
            <p className="mt-2 text-sm text-[var(--text-body)]">
              Будут отмечены наряды из текущего списка печати этикеток: {orderIds.length}.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={bulkBusy}
                className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
                onClick={() => setConfirmOpen(false)}
              >
                Нет
              </button>
              <button
                type="button"
                disabled={bulkBusy}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                onClick={() => void markPrintedShipments()}
              >
                {bulkBusy ? "Отмечаем…" : "Да"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {undoState ? (
        <div className="no-print fixed bottom-4 left-4 z-[230] max-w-sm rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-xl dark:border-emerald-800/70 dark:bg-emerald-950 dark:text-emerald-50">
          <div className="font-semibold">
            Работы отправлены: {undoState.count}
          </div>
          <button
            type="button"
            disabled={bulkBusy}
            className="mt-2 rounded-md border border-emerald-500/60 bg-white/80 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-white disabled:opacity-50 dark:bg-emerald-900/60 dark:text-emerald-50 dark:hover:bg-emerald-900"
            onClick={() => void undoMarkPrintedShipments()}
          >
            Отменить
          </button>
        </div>
      ) : null}
    </>
  );
}
