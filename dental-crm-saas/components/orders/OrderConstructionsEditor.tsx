"use client";

import type { JawArch } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PriceListPickModal,
  type PriceListPickRow,
} from "@/components/orders/new-order-form/PriceListPickModal";
import { PriceListLineToothModal } from "@/components/orders/new-order-form/PriceListLineToothModal";

const inp =
  "w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]";

const financeInputClass =
  "w-full rounded border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-xs text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]";

export type ConstructionTypeRow = {
  id: string;
  name: string;
  isArchWork: boolean;
};

type MaterialRow = { id: string; name: string };

export type DraftConstructionKind = "fixed" | "arch" | "bridge" | "priceList";

export type DraftConstructionLine = {
  kind: DraftConstructionKind;
  constructionTypeId: string;
  priceListItemId: string;
  priceListCode: string;
  priceListName: string;
  materialId: string;
  shade: string;
  quantity: number;
  unitPrice: string;
  teethCsv: string;
  /** Для прайса: челюсть; для «дуга» — выбранная дуга; иначе заглушка */
  arch: JawArch | null;
  bridgeFrom: string;
  bridgeTo: string;
};

function emptyLine(kind: DraftConstructionKind): DraftConstructionLine {
  return {
    kind,
    constructionTypeId: "",
    priceListItemId: "",
    priceListCode: "",
    priceListName: "",
    materialId: "",
    shade: "",
    quantity: 1,
    unitPrice: "",
    teethCsv: "",
    arch: kind === "priceList" ? null : "UPPER",
    bridgeFrom: "",
    bridgeTo: "",
  };
}

function teethFromJson(v: unknown): string {
  if (!Array.isArray(v)) return "";
  return v.map((x) => String(x).trim()).filter(Boolean).join(", ");
}

/** Из строк Prisma / API в черновики редактора */
export function constructionsToDraft(
  rows: Array<{
    category: string;
    constructionTypeId: string | null;
    priceListItemId?: string | null;
    priceListItem?: {
      code: string;
      name: string;
      priceRub: number;
    } | null;
    materialId: string | null;
    shade: string | null;
    quantity: number;
    unitPrice: number | null;
    teethFdi: unknown;
    bridgeFromFdi: string | null;
    bridgeToFdi: string | null;
    arch: string | null;
  }>,
): DraftConstructionLine[] {
  return rows.map((r) => {
    if (r.category === "PRICE_LIST" && r.priceListItemId) {
      const pl = r.priceListItem;
      const fallbackPrice =
        r.unitPrice != null
          ? String(r.unitPrice)
          : pl != null
            ? String(pl.priceRub)
            : "";
      const jaw =
        r.arch === "UPPER" || r.arch === "LOWER" || r.arch === "BOTH"
          ? r.arch
          : null;
      return {
        kind: "priceList",
        constructionTypeId: "",
        priceListItemId: r.priceListItemId,
        priceListCode: pl?.code ?? "",
        priceListName: pl?.name ?? "",
        materialId: r.materialId ?? "",
        shade: r.shade ?? "",
        quantity: r.quantity,
        unitPrice: fallbackPrice,
        teethCsv: teethFromJson(r.teethFdi),
        arch: jaw,
        bridgeFrom: "",
        bridgeTo: "",
      };
    }
    if (r.category === "BRIDGE") {
      return {
        kind: "bridge",
        constructionTypeId: r.constructionTypeId ?? "",
        priceListItemId: "",
        priceListCode: "",
        priceListName: "",
        materialId: r.materialId ?? "",
        shade: r.shade ?? "",
        quantity: r.quantity,
        unitPrice:
          r.unitPrice != null ? String(r.unitPrice) : "",
        teethCsv: "",
        arch: "UPPER",
        bridgeFrom: r.bridgeFromFdi ?? "",
        bridgeTo: r.bridgeToFdi ?? "",
      };
    }
    if (r.category === "ARCH") {
      const a = r.arch === "LOWER" || r.arch === "BOTH" ? r.arch : "UPPER";
      return {
        kind: "arch",
        constructionTypeId: r.constructionTypeId ?? "",
        priceListItemId: "",
        priceListCode: "",
        priceListName: "",
        materialId: r.materialId ?? "",
        shade: r.shade ?? "",
        quantity: r.quantity,
        unitPrice:
          r.unitPrice != null ? String(r.unitPrice) : "",
        teethCsv: "",
        arch: a,
        bridgeFrom: "",
        bridgeTo: "",
      };
    }
    return {
      kind: "fixed",
      constructionTypeId: r.constructionTypeId ?? "",
      priceListItemId: "",
      priceListCode: "",
      priceListName: "",
      materialId: r.materialId ?? "",
      shade: r.shade ?? "",
      quantity: r.quantity,
      unitPrice: r.unitPrice != null ? String(r.unitPrice) : "",
      teethCsv: teethFromJson(r.teethFdi),
      arch: "UPPER",
      bridgeFrom: "",
      bridgeTo: "",
    };
  });
}

/** JSON для PATCH (формат buildConstructionCreatesFromInput) */
export function draftToConstructionPayload(
  lines: DraftConstructionLine[],
): unknown[] {
  const out: unknown[] = [];
  for (const row of lines) {
    const qty = Number.isFinite(row.quantity) && row.quantity >= 1 ? Math.floor(row.quantity) : 1;
    const priceRaw = row.unitPrice.trim();
    const unitPrice =
      priceRaw === "" ? null : Number(priceRaw.replace(",", "."));
    const shade = row.shade.trim() || null;
    const materialId = row.materialId.trim() || null;

    if (row.kind === "priceList") {
      const plId = row.priceListItemId.trim();
      if (!plId) continue;
      const p =
        unitPrice != null && !Number.isNaN(unitPrice) ? unitPrice : null;
      const teeth = row.teethCsv
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const payload: Record<string, unknown> = {
        priceListItemId: plId,
        quantity: qty,
        unitPrice: p,
      };
      if (teeth.length > 0) payload.teethFdi = teeth;
      if (
        row.arch === "UPPER" ||
        row.arch === "LOWER" ||
        row.arch === "BOTH"
      ) {
        payload.arch = row.arch;
      }
      out.push(payload);
      continue;
    }

    if (row.kind === "bridge") {
      out.push({
        constructionTypeId: row.constructionTypeId.trim() || null,
        bridgeFromFdi: row.bridgeFrom.trim(),
        bridgeToFdi: row.bridgeTo.trim(),
        quantity: qty,
        unitPrice,
        shade,
        materialId,
      });
      continue;
    }
    if (row.kind === "arch") {
      const a = row.arch ?? "UPPER";
      out.push({
        constructionTypeId: row.constructionTypeId.trim(),
        arch: a,
        quantity: qty,
        unitPrice,
        shade,
        materialId,
      });
      continue;
    }
    const teeth = row.teethCsv
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    out.push({
      constructionTypeId: row.constructionTypeId.trim(),
      teethFdi: teeth,
      quantity: qty,
      unitPrice,
      shade,
      materialId,
    });
  }
  return out;
}

export function OrderConstructionsEditor({
  value,
  onChange,
}: {
  value: DraftConstructionLine[];
  onChange: (next: DraftConstructionLine[]) => void;
}) {
  const [types, setTypes] = useState<ConstructionTypeRow[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [pickOpen, setPickOpen] = useState(false);
  const [toothLineIdx, setToothLineIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tRes, mRes] = await Promise.all([
          fetch("/api/construction-types"),
          fetch("/api/materials"),
        ]);
        if (tRes.ok) {
          const data = (await tRes.json()) as ConstructionTypeRow[];
          if (!cancelled) setTypes(data);
        }
        if (mRes.ok) {
          const data = (await mRes.json()) as MaterialRow[];
          if (!cancelled) setMaterials(data);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const remove = useCallback(
    (idx: number) => {
      onChange(value.filter((_, i) => i !== idx));
    },
    [value, onChange],
  );

  const patch = useCallback(
    (idx: number, part: Partial<DraftConstructionLine>) => {
      onChange(
        value.map((r, i) => (i === idx ? { ...r, ...part } : r)),
      );
    },
    [value, onChange],
  );

  const onPickPrice = useCallback(
    (row: PriceListPickRow) => {
      const line = emptyLine("priceList");
      line.priceListItemId = row.id;
      line.priceListCode = row.code;
      line.priceListName = row.name;
      line.unitPrice = String(row.priceRub);
      onChange([...value, line]);
    },
    [value, onChange],
  );

  const toothModalRow = useMemo(() => {
    if (toothLineIdx == null) return null;
    const row = value[toothLineIdx];
    if (row?.kind !== "priceList") return null;
    return row;
  }, [toothLineIdx, value]);

  const priceLabel = (row: DraftConstructionLine) =>
    row.priceListCode || row.priceListName
      ? `${row.priceListCode} · ${row.priceListName}`
      : "позиция";

  const addFromPriceTile = (
    <button
      type="button"
      aria-label="Добавить позицию из прайса"
      title="Добавить из прайса"
      onClick={() => setPickOpen(true)}
      className="flex min-h-[11rem] w-full min-w-0 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--card-border)] bg-[var(--surface-subtle)]/40 p-3 text-[var(--text-muted)] transition-colors hover:border-[var(--sidebar-blue)] hover:bg-[var(--card-bg)] hover:text-[var(--sidebar-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-current bg-[var(--card-bg)] text-[var(--text-strong)]">
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
    </button>
  );

  return (
    <div className="space-y-4">
      {value.some((r) => r.kind !== "priceList") ? (
        <ul className="space-y-3">
          {value.map((row, idx) =>
            row.kind === "priceList" ? null : (
              <li
                key={`legacy-${idx}`}
                className="rounded-lg border border-amber-200/60 bg-amber-50/20 p-3 dark:border-amber-900/40 dark:bg-amber-950/20"
              >
                <p className="mb-2 text-xs text-amber-900/90 dark:text-amber-200/90">
                  Строка не из прайса (исторические данные). Новые позиции — пунктирная плашка «+» в
                  ряду карточек прайса.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)]">
                    Тип работы
                    <select
                      className={inp}
                      value={row.constructionTypeId}
                      onChange={(e) =>
                        patch(idx, { constructionTypeId: e.target.value })
                      }
                    >
                      <option value="">Выбрать</option>
                      {types
                        .filter((t) =>
                          row.kind === "arch"
                            ? t.isArchWork
                            : row.kind === "bridge"
                              ? true
                              : !t.isArchWork,
                        )
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)]">
                    Материал
                    <select
                      className={inp}
                      value={row.materialId}
                      onChange={(e) =>
                        patch(idx, { materialId: e.target.value })
                      }
                    >
                      <option value="">—</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)]">
                    Оттенок
                    <input
                      className={inp}
                      value={row.shade}
                      onChange={(e) => patch(idx, { shade: e.target.value })}
                      placeholder="A2"
                    />
                  </label>

                  {row.kind === "fixed" ? (
                    <label className="sm:col-span-2 flex flex-col gap-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)]">
                      Зубы FDI (через запятую)
                      <input
                        className={inp}
                        value={row.teethCsv}
                        onChange={(e) =>
                          patch(idx, { teethCsv: e.target.value })
                        }
                        placeholder="14, 15, 16"
                      />
                    </label>
                  ) : null}

                  {row.kind === "arch" ? (
                    <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)]">
                      Дуга
                      <select
                        className={inp}
                        value={row.arch ?? "UPPER"}
                        onChange={(e) =>
                          patch(idx, {
                            arch: e.target.value as JawArch,
                          })
                        }
                      >
                        <option value="UPPER">Верх</option>
                        <option value="LOWER">Низ</option>
                        <option value="BOTH">Обе</option>
                      </select>
                    </label>
                  ) : null}

                  {row.kind === "bridge" ? (
                    <>
                      <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)]">
                        Мост от (FDI)
                        <input
                          className={inp}
                          value={row.bridgeFrom}
                          onChange={(e) =>
                            patch(idx, { bridgeFrom: e.target.value.trim() })
                          }
                          placeholder="47"
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)]">
                        Мост до (FDI)
                        <input
                          className={inp}
                          value={row.bridgeTo}
                          onChange={(e) =>
                            patch(idx, { bridgeTo: e.target.value.trim() })
                          }
                          placeholder="37"
                        />
                      </label>
                    </>
                  ) : null}

                  <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)]">
                    Количество
                    <input
                      type="number"
                      min={1}
                      className={inp}
                      value={row.quantity}
                      onChange={(e) =>
                        patch(idx, {
                          quantity: Math.max(
                            1,
                            parseInt(e.target.value, 10) || 1,
                          ),
                        })
                      }
                    />
                  </label>

                  <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)]">
                    Цена за ед., ₽
                    <input
                      className={inp}
                      value={row.unitPrice}
                      onChange={(e) =>
                        patch(idx, { unitPrice: e.target.value })
                      }
                      placeholder="пусто — без цены"
                    />
                  </label>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="text-xs text-red-600 underline"
                  >
                    Удалить строку
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-3 pb-1 pt-1 sm:grid-cols-2">
        {value.map((row, idx) =>
          row.kind !== "priceList" ? null : (
            <div
              key={`pl-${idx}`}
              className="flex min-w-0 w-full flex-col space-y-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3"
            >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    <span className="text-[var(--text-muted)]">Прайс · </span>
                    <span className="text-[var(--text-strong)]">
                      {priceLabel(row)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-[var(--text-muted)] underline hover:text-[var(--text-strong)]"
                    onClick={() => remove(idx)}
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
                      value={row.quantity}
                      onChange={(e) =>
                        patch(idx, {
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
                      value={row.unitPrice}
                      placeholder="—"
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        patch(idx, {
                          unitPrice: v,
                        });
                      }}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Челюсть
                  <select
                    className={financeInputClass}
                    value={row.arch ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      patch(idx, {
                        arch:
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
                    onClick={() => setToothLineIdx(idx)}
                  >
                    Зубы…
                  </button>
                  {row.teethCsv.trim() ? (
                    <span className="font-mono text-xs text-[var(--text-secondary)]">
                      {row.teethCsv
                        .split(/[\s,;]+/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">нет</span>
                  )}
                </div>
            </div>
          ),
        )}
        {addFromPriceTile}
      </div>

      <PriceListPickModal
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        onPick={onPickPrice}
        title="Позиция из прайса"
      />

      <PriceListLineToothModal
        open={toothModalRow != null}
        title={toothModalRow ? priceLabel(toothModalRow) : "позиция"}
        initialTeeth={
          toothModalRow
            ? toothModalRow.teethCsv
                .split(/[\s,;]+/)
                .map((s) => s.trim())
                .filter(Boolean)
            : []
        }
        onClose={() => setToothLineIdx(null)}
        onCommit={(teeth) => {
          if (toothLineIdx != null) {
            patch(toothLineIdx, {
              teethCsv: teeth.join(", "),
            });
          }
          setToothLineIdx(null);
        }}
      />
    </div>
  );
}
