"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { JawArch } from "@prisma/client";
import {
  PriceListPickModal,
  type PriceListPickRow,
} from "./PriceListPickModal";
import { PriceListLineToothModal } from "./PriceListLineToothModal";
import {
  type DetailLine,
  newDetailLineId,
} from "./detail-lines";

type ConstructionTypeRow = { id: string; name: string };

const financeInputClass =
  "w-full rounded border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-xs text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]";

function archLabelRu(a: JawArch): string {
  switch (a) {
    case "UPPER":
      return "верх.";
    case "LOWER":
      return "низ.";
    case "BOTH":
      return "обе";
    default:
      return a;
  }
}

export function PodrobnoSection({
  lines,
  onLinesChange,
  clinicId,
  doctorId,
}: {
  lines: DetailLine[];
  onLinesChange: (next: DetailLine[]) => void;
  clinicId?: string | null;
  doctorId?: string | null;
}) {
  const [types, setTypes] = useState<ConstructionTypeRow[]>([]);
  const [pickOpen, setPickOpen] = useState(false);
  const [toothLineId, setToothLineId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/construction-types");
        if (!res.ok) return;
        const data = (await res.json()) as ConstructionTypeRow[];
        if (!cancelled) setTypes(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const typeNameById = useCallback(
    (id: string) => types.find((t) => t.id === id)?.name ?? id,
    [types],
  );

  const priceLines = useMemo(
    () => lines.filter((l): l is Extract<DetailLine, { kind: "priceList" }> => l.kind === "priceList"),
    [lines],
  );

  const legacyLines = useMemo(
    () => lines.filter((l) => l.kind !== "priceList"),
    [lines],
  );

  const onPickPrice = useCallback(
    (row: PriceListPickRow) => {
      onLinesChange([
        ...lines,
        {
          id: newDetailLineId(),
          kind: "priceList",
          priceListItemId: row.id,
          label: `${row.code} · ${row.name}`,
          quantity: 1,
          unitPrice: row.priceRub,
          isIndividualPrice: row.isIndividualPrice === true,
        },
      ]);
    },
    [lines, onLinesChange],
  );

  const removeLine = useCallback(
    (id: string) => {
      onLinesChange(lines.filter((l) => l.id !== id));
    },
    [lines, onLinesChange],
  );

  const patchPriceLine = useCallback(
    (
      lineId: string,
      patch: Partial<{
        jawArch: JawArch | null;
        teethFdi: string[];
        quantity: number;
        unitPrice: number | null;
      }>,
    ) => {
      onLinesChange(
        lines.map((l) => {
          if (l.id !== lineId || l.kind !== "priceList") return l;
          return { ...l, ...patch };
        }),
      );
    },
    [lines, onLinesChange],
  );

  const toothModalLine = useMemo(
    () =>
      toothLineId == null
        ? null
        : lines.find((l) => l.id === toothLineId && l.kind === "priceList") ??
          null,
    [lines, toothLineId],
  );

  return (
    <section className="border-t border-[var(--card-border)] pt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--app-text)] sm:text-base">
          Подробно
        </h3>
        <button
          type="button"
          className="rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-strong)] shadow-sm transition-colors hover:border-[var(--input-border)] hover:bg-[var(--card-bg)] sm:text-sm"
          onClick={() => setPickOpen(true)}
        >
          Добавить
        </button>
      </div>

      {legacyLines.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {legacyLines.map((line) => (
            <li
              key={line.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/60 bg-amber-50/20 px-3 py-2 text-sm dark:border-amber-900/40 dark:bg-amber-950/20"
            >
              <span className="min-w-0 text-[var(--text-strong)]">
                {line.kind === "teeth" ? (
                  <>
                    <span className="font-medium">
                      {typeNameById(line.constructionTypeId)}
                    </span>
                    <span className="font-mono text-[var(--text-secondary)]">
                      {": "}
                      {line.teethFdi.join(", ")}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-medium">
                      {typeNameById(line.constructionTypeId)}
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {": "}
                      {archLabelRu(line.arch)}
                    </span>
                  </>
                )}
                <span className="ml-2 text-xs text-[var(--text-muted)]">
                  (из черновика)
                </span>
              </span>
              <button
                type="button"
                className="shrink-0 text-xs text-red-600 underline hover:no-underline"
                onClick={() => removeLine(line.id)}
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {priceLines.length === 0 ? null : (
        <div className="flex gap-3 overflow-x-auto pb-1 pt-1 [scrollbar-gutter:stable]">
          {priceLines.map((line) => (
            <div
              key={line.id}
              className="w-[min(100%,20rem)] shrink-0 space-y-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  <span className="text-[var(--text-muted)]">Прайс · </span>
                  <span className="text-[var(--text-strong)]">
                    {line.label ?? "позиция"}
                  </span>
                  {line.isIndividualPrice ? (
                    <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950">
                      Индивидуальная цена
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs text-[var(--text-muted)] underline hover:text-[var(--text-strong)]"
                  onClick={() => removeLine(line.id)}
                >
                  Удалить
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Кол-во
                  <input
                    type="number"
                    min={1}
                    className={financeInputClass}
                    value={line.quantity ?? 1}
                    onChange={(e) =>
                      patchPriceLine(line.id, {
                        quantity: Math.max(
                          1,
                          parseInt(e.target.value, 10) || 1,
                        ),
                      })
                    }
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Цена ₽
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className={financeInputClass}
                    value={line.unitPrice ?? ""}
                    placeholder="—"
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      patchPriceLine(line.id, {
                        unitPrice:
                          v === "" ? null : Math.max(0, Number(v) || 0),
                      });
                    }}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Челюсть
                <select
                  className={financeInputClass}
                  value={line.jawArch ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    patchPriceLine(line.id, {
                      jawArch:
                        v === "" ? null : (v as JawArch),
                    });
                  }}
                >
                  <option value="">Не указано</option>
                  <option value="UPPER">Верхняя</option>
                  <option value="LOWER">Нижняя</option>
                  <option value="BOTH">Обе</option>
                </select>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-blue)] underline hover:no-underline"
                  onClick={() => setToothLineId(line.id)}
                >
                  Зубы…
                </button>
                {(line.teethFdi?.length ?? 0) > 0 ? (
                  <span className="font-mono text-xs text-[var(--text-secondary)]">
                    {line.teethFdi!.join(", ")}
                  </span>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">нет</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <PriceListPickModal
        open={pickOpen}
        clinicId={clinicId}
        doctorId={doctorId}
        onClose={() => setPickOpen(false)}
        onPick={onPickPrice}
        title="Позиция из прайса"
      />

      <PriceListLineToothModal
        open={toothModalLine != null}
        title={
          toothModalLine?.kind === "priceList"
            ? (toothModalLine.label ?? "позиция")
            : "позиция"
        }
        initialTeeth={
          toothModalLine?.kind === "priceList"
            ? [...(toothModalLine.teethFdi ?? [])]
            : []
        }
        onClose={() => setToothLineId(null)}
        onCommit={(teeth) => {
          if (toothLineId) {
            patchPriceLine(toothLineId, { teethFdi: teeth });
          }
          setToothLineId(null);
        }}
      />
    </section>
  );
}
