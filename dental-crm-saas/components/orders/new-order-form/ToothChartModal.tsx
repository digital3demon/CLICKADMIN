"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LOWER_FDI_ROW, UPPER_FDI_ROW, sortTeethFdi } from "@/lib/fdi-teeth";
import {
  type DetailLine,
  newDetailLineId,
} from "./detail-lines";

type ToothChartModalProps = {
  open: boolean;
  constructionTypeId: string;
  typeName: string;
  lines: DetailLine[];
  typeNameById: (id: string) => string;
  onClose: () => void;
  onCommit: (next: DetailLine[]) => void;
};

const MID_GAP = 28;
const STEP = 38;
const PAD = 26;
const Y_UPPER = 42;
const Y_LOWER = 158;

function xForIndex(i: number): number {
  return PAD + i * STEP + (i >= 8 ? MID_GAP : 0);
}

/** Упрощённый силуэт зуба (без кружков), центр основания корня в (cx, cy) */
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

function collectConflicts(
  lines: DetailLine[],
  editingTypeId: string,
  draftTeeth: string[],
  typeNameById: (id: string) => string,
): { fdi: string; otherTypeName: string }[] {
  const others = lines.filter(
    (l) => !(l.kind === "teeth" && l.constructionTypeId === editingTypeId),
  );
  const out: { fdi: string; otherTypeName: string }[] = [];
  for (const t of draftTeeth) {
    for (const l of others) {
      if (l.kind === "teeth" && l.teethFdi.includes(t)) {
        out.push({ fdi: t, otherTypeName: typeNameById(l.constructionTypeId) });
        break;
      }
    }
  }
  return out;
}

function finalizeTeethNoConflict(
  all: DetailLine[],
  typeId: string,
  sortedTeeth: string[],
): DetailLine[] {
  const base = all.filter(
    (l) => !(l.kind === "teeth" && l.constructionTypeId === typeId),
  );
  if (sortedTeeth.length === 0) return base;
  const prev = all.find(
    (l) => l.kind === "teeth" && l.constructionTypeId === typeId,
  );
  const id = prev?.id ?? newDetailLineId();
  const finance =
    prev?.kind === "teeth"
      ? {
          quantity: prev.quantity,
          unitPrice: prev.unitPrice,
          materialId: prev.materialId,
          shade: prev.shade,
        }
      : {};
  return [
    ...base,
    {
      id,
      constructionTypeId: typeId,
      kind: "teeth" as const,
      teethFdi: sortedTeeth,
      ...finance,
    },
  ];
}

function finalizeTeethSteal(
  all: DetailLine[],
  typeId: string,
  sortedTeeth: string[],
): DetailLine[] {
  let base = all.filter(
    (l) => !(l.kind === "teeth" && l.constructionTypeId === typeId),
  );
  base = base
    .map((l) => {
      if (l.kind !== "teeth") return l;
      return {
        ...l,
        teethFdi: l.teethFdi.filter((t) => !sortedTeeth.includes(t)),
      };
    })
    .filter((l) => l.kind !== "teeth" || l.teethFdi.length > 0);
  if (sortedTeeth.length === 0) return base;
  const prev = all.find(
    (l) => l.kind === "teeth" && l.constructionTypeId === typeId,
  );
  const id = prev?.id ?? newDetailLineId();
  const finance =
    prev?.kind === "teeth"
      ? {
          quantity: prev.quantity,
          unitPrice: prev.unitPrice,
          materialId: prev.materialId,
          shade: prev.shade,
        }
      : {};
  return [
    ...base,
    {
      id,
      constructionTypeId: typeId,
      kind: "teeth" as const,
      teethFdi: sortedTeeth,
      ...finance,
    },
  ];
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
  onPointerDownTooth: (fdi: string, e: React.PointerEvent<SVGPathElement>) => void;
  onPointerEnterTooth: (fdi: string, e: React.PointerEvent<SVGPathElement>) => void;
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

export function ToothChartModal({
  open,
  constructionTypeId,
  typeName,
  lines,
  typeNameById,
  onClose,
  onCommit,
}: ToothChartModalProps) {
  const [draft, setDraft] = useState<Set<string>>(() => new Set());
  const paintRef = useRef<"select" | "deselect" | null>(null);
  const [conflicts, setConflicts] = useState<
    { fdi: string; otherTypeName: string }[] | null
  >(null);

  useEffect(() => {
    if (!open) return;
    const existing = lines.find(
      (l) =>
        l.kind === "teeth" && l.constructionTypeId === constructionTypeId,
    );
    const s = new Set(
      existing?.kind === "teeth" ? existing.teethFdi : [],
    );
    setDraft(s);
    setConflicts(null);
    paintRef.current = null;
  }, [open, constructionTypeId, lines]);

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

  const trySave = useCallback(
    (steal: boolean) => {
      const sorted = sortTeethFdi([...draft]);
      if (steal) {
        onCommit(finalizeTeethSteal(lines, constructionTypeId, sorted));
        setConflicts(null);
        onClose();
        return;
      }
      const c = collectConflicts(
        lines,
        constructionTypeId,
        sorted,
        typeNameById,
      );
      if (c.length > 0) {
        setConflicts(c);
        return;
      }
      onCommit(finalizeTeethNoConflict(lines, constructionTypeId, sorted));
      onClose();
    },
    [constructionTypeId, draft, lines, onClose, onCommit, typeNameById],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tooth-chart-title"
    >
      <div className="max-h-[min(92vh,720px)] w-full max-w-[820px] overflow-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
        <div className="border-b border-[var(--card-border)] px-4 py-3 sm:px-5">
          <h2
            id="tooth-chart-title"
            className="text-base font-semibold text-[var(--app-text)] sm:text-lg"
          >
            Выбор зубов: {typeName}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Клик и перетаскивание с зажатой левой кнопкой по зубам — выделение
            или снятие выделения.
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
            onClick={() => trySave(false)}
          >
            Сохранить
          </button>
        </div>
      </div>

      {conflicts && conflicts.length > 0 ? (
        <div
          className="absolute inset-0 z-[130] flex items-center justify-center bg-zinc-900/40 p-4"
          role="alertdialog"
          aria-labelledby="conflict-title"
        >
          <div className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-xl">
            <h3
              id="conflict-title"
              className="text-base font-semibold text-[var(--app-text)]"
            >
              Зубы уже назначены
            </h3>
            <ul className="mt-3 max-h-40 list-inside list-disc space-y-1 overflow-y-auto text-sm text-[var(--text-body)]">
              {conflicts.map((c) => (
                <li key={c.fdi}>
                  Зуб <span className="font-mono font-semibold">{c.fdi}</span>{" "}
                  — сейчас «{c.otherTypeName}». Новый тип: «{typeName}».
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Заменить тип работы для этих зубов на «{typeName}» или вернуться к
              выбору зубов?
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
                onClick={() => setConflicts(null)}
              >
                Скорректировать выбор
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={() => trySave(true)}
              >
                Заменить тип
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
