"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ShipmentsStickersPrintButton } from "@/components/shipments/ShipmentsStickersPrintButton";
import {
  ShipmentsStickersSheet,
  type StickerRow,
} from "@/components/shipments/ShipmentsStickersSheet";

const W_MIN = 25;
const W_MAX = 120;
const H_MIN = 20;
const H_MAX = 100;

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
    return "Внизу слева QR и «Отсканируй меня», справа — «Сделано в» и логотип по центру.";
  }, [widthMm, heightMm]);

  const layoutNote = useMemo(() => {
    const r = widthMm / heightMm;
    const wide = r >= 1.32;
    return `Текущий макет: ${widthMm}×${heightMm} мм${wide ? " · врач и пациент в ряд" : ""}.`;
  }, [widthMm, heightMm]);

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <Link
          href={backHref}
          className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
        >
          ← К отгрузкам
        </Link>
        <ShipmentsStickersPrintButton />
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
      <p className="no-print mb-2 text-xs text-[var(--text-secondary)]">{layoutNote}</p>
      {otherSize ? (
        <p className="no-print mb-3 max-w-2xl text-xs text-[var(--text-secondary)]">{hint}</p>
      ) : null}
      <ShipmentsStickersSheet rows={rows} widthMm={widthMm} heightMm={heightMm} />
    </>
  );
}
