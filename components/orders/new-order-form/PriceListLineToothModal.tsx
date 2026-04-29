"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LOWER_FDI_ROW, UPPER_FDI_ROW, sortTeethFdi } from "@/lib/fdi-teeth";

const MID_GAP = 28;
const STEP = 38;
const PAD = 26;
const Y_UPPER = 42;
const Y_LOWER = 158;

function xForIndex(i: number): number {
  return PAD + i * STEP + (i >= 8 ? MID_GAP : 0);
}

function toothPathD(cx: number, cy: number): string {
  const w = 13;
  const crownH = 18;
  const rootH = 16;
  const top = cy - rootH - crownH;
  return [
    `M ${cx - w} ${cy - rootH}`,
    `Q ${cx} ${top + 4} ${cx + w} ${cy - rootH}`,
    `L ${cx + w * 0.65} ${cy}`,
    `L ${cx} ${cy + rootH * 0.35}`,
    `L ${cx - w * 0.65} ${cy}`,
    `Z`,
  ].join(" ");
}

function ToothRow({
  fdiList,
  y,
  selected,
  onPointerDownTooth,
  onPointerEnterTooth,
  onLostCapture,
}: {
  fdiList: readonly string[];
  y: number;
  selected: Set<string>;
  onPointerDownTooth: (
    fdi: string,
    e: React.PointerEvent<SVGPathElement>,
  ) => void;
  onPointerEnterTooth: (
    fdi: string,
    e: React.PointerEvent<SVGPathElement>,
  ) => void;
  onLostCapture: () => void;
}) {
  return (
    <g>
      {fdiList.map((fdi, i) => {
        const cx = xForIndex(i);
        const d = toothPathD(cx, y);
        const sel = selected.has(fdi);
        return (
          <g key={fdi}>
            <path
              d={d}
              className={`cursor-pointer touch-none stroke-zinc-700 stroke-[1.25] transition-colors ${
                sel
                  ? "fill-[var(--sidebar-blue)]/35"
                  : "fill-white hover:fill-zinc-100"
              }`}
              onPointerDown={(e) => onPointerDownTooth(fdi, e)}
              onPointerEnter={(e) => onPointerEnterTooth(fdi, e)}
              onLostPointerCapture={onLostCapture}
            />
            <text
              x={cx}
              y={y + 36}
              textAnchor="middle"
              className="pointer-events-none fill-zinc-600 text-[10px] font-semibold tabular-nums"
            >
              {fdi}
            </text>
          </g>
        );
      })}
    </g>
  );
}

type Props = {
  open: boolean;
  title: string;
  initialTeeth: string[];
  onClose: () => void;
  onCommit: (teethFdi: string[]) => void;
};

export function PriceListLineToothModal({
  open,
  title,
  initialTeeth,
  onClose,
  onCommit,
}: Props) {
  const [draft, setDraft] = useState<Set<string>>(() => new Set());
  const paintRef = useRef<"select" | "deselect" | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(new Set(initialTeeth));
    paintRef.current = null;
  }, [open, initialTeeth]);

  const apply = useCallback((fdi: string, mode: "select" | "deselect") => {
    setDraft((prev) => {
      const n = new Set(prev);
      if (mode === "select") n.add(fdi);
      else n.delete(fdi);
      return n;
    });
  }, []);

  const onPointerDownTooth = useCallback(
    (fdi: string, e: React.PointerEvent<SVGPathElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      setDraft((prev) => {
        const was = prev.has(fdi);
        paintRef.current = was ? "deselect" : "select";
        const n = new Set(prev);
        if (was) n.delete(fdi);
        else n.add(fdi);
        return n;
      });
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [],
  );

  const onPointerEnterTooth = useCallback(
    (fdi: string, e: React.PointerEvent<SVGPathElement>) => {
      if ((e.buttons & 1) === 0 || !paintRef.current) return;
      apply(fdi, paintRef.current);
    },
    [apply],
  );

  const onLostCapture = useCallback(() => {
    paintRef.current = null;
  }, []);

  const save = useCallback(() => {
    onCommit(sortTeethFdi([...draft]));
    onClose();
  }, [draft, onCommit, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const overlay = (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-zinc-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="price-line-tooth-title"
    >
      <div className="max-h-[min(92vh,720px)] w-full max-w-[820px] overflow-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
        <div className="border-b border-[var(--card-border)] px-4 py-3 sm:px-5">
          <h2
            id="price-line-tooth-title"
            className="text-base font-semibold text-[var(--app-text)] sm:text-lg"
          >
            Зубы: {title}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            По желанию. Клик и перетаскивание с зажатой левой кнопкой.
          </p>
        </div>

        <div className="px-3 py-4 sm:px-5">
          <svg
            viewBox="0 0 760 220"
            className="mx-auto h-auto w-full max-w-[720px] select-none"
            style={{ userSelect: "none" }}
          >
            <text
              x={380}
              y={16}
              textAnchor="middle"
              className="fill-zinc-500 text-[11px] font-semibold uppercase tracking-wide"
            >
              Верхняя челюсть
            </text>
            <ToothRow
              fdiList={UPPER_FDI_ROW}
              y={Y_UPPER}
              selected={draft}
              onPointerDownTooth={onPointerDownTooth}
              onPointerEnterTooth={onPointerEnterTooth}
              onLostCapture={onLostCapture}
            />
            <text
              x={380}
              y={Y_LOWER - 54}
              textAnchor="middle"
              className="fill-zinc-500 text-[11px] font-semibold uppercase tracking-wide"
            >
              Нижняя челюсть
            </text>
            <ToothRow
              fdiList={LOWER_FDI_ROW}
              y={Y_LOWER}
              selected={draft}
              onPointerDownTooth={onPointerDownTooth}
              onPointerEnterTooth={onPointerEnterTooth}
              onLostCapture={onLostCapture}
            />
          </svg>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--card-border)] px-4 py-3 sm:px-5">
          <button
            type="button"
            className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)]"
            onClick={save}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
