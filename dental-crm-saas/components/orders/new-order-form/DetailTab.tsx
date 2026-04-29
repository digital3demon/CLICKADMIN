"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { JawArch } from "@prisma/client";
import {
  type DetailFinanceFields,
  type DetailLine,
  newDetailLineId,
} from "./detail-lines";
import { ToothChartModal } from "./ToothChartModal";
import { PriceListTabbedBody } from "@/components/price-list/PriceListTabbedBody";

type ConstructionTypeRow = {
  id: string;
  name: string;
  isArchWork: boolean;
};

type MaterialRow = { id: string; name: string };

type PriceListApiRow = {
  id: string;
  code: string;
  name: string;
  sectionTitle?: string | null;
  subsectionTitle?: string | null;
  description?: string | null;
  priceRub: number;
  leadWorkingDays: number | null;
};

function archLabelRu(a: JawArch): string {
  switch (a) {
    case "UPPER":
      return "верхняя челюсть";
    case "LOWER":
      return "нижняя челюсть";
    case "BOTH":
      return "обе челюсти";
    default:
      return a;
  }
}

function ArchWorkModal({
  open,
  constructionTypeId,
  typeName,
  lines,
  onClose,
  onCommit,
}: {
  open: boolean;
  constructionTypeId: string;
  typeName: string;
  lines: DetailLine[];
  onClose: () => void;
  onCommit: (next: DetailLine[]) => void;
}) {
  const [arch, setArch] = useState<JawArch>("UPPER");

  useEffect(() => {
    if (!open) return;
    const ex = lines.find(
      (l) =>
        l.kind === "arch" && l.constructionTypeId === constructionTypeId,
    );
    setArch(ex?.kind === "arch" ? ex.arch : "UPPER");
  }, [open, constructionTypeId, lines]);

  const save = useCallback(() => {
    const base = lines.filter(
      (l) =>
        !(l.kind === "arch" && l.constructionTypeId === constructionTypeId),
    );
    const prev = lines.find(
      (l) =>
        l.kind === "arch" && l.constructionTypeId === constructionTypeId,
    );
    const id = prev?.id ?? newDetailLineId();
    const finance =
      prev?.kind === "arch"
        ? {
            quantity: prev.quantity,
            unitPrice: prev.unitPrice,
            materialId: prev.materialId,
            shade: prev.shade,
          }
        : {};
    onCommit([
      ...base,
      {
        id,
        constructionTypeId,
        kind: "arch" as const,
        arch,
        ...finance,
      },
    ]);
    onClose();
  }, [arch, constructionTypeId, lines, onClose, onCommit]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arch-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-2xl">
        <h2
          id="arch-modal-title"
          className="text-lg font-semibold text-[var(--app-text)]"
        >
          {typeName}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Укажите, на какую дугу относится работа.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {(
            [
              ["UPPER", "Верхняя челюсть"],
              ["LOWER", "Нижняя челюсть"],
              ["BOTH", "Обе челюсти"],
            ] as const
          ).map(([v, label]) => (
            <label
              key={v}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2 hover:bg-[var(--table-row-hover)]"
            >
              <input
                type="radio"
                name="arch"
                value={v}
                checked={arch === v}
                onChange={() => setArch(v)}
                className="text-[var(--sidebar-blue)]"
              />
              <span className="text-sm font-medium text-[var(--text-strong)]">
                {label}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
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
}

const financeInputClass =
  "w-full rounded border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-xs text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]";

export function DetailTab({
  lines,
  onLinesChange,
}: {
  lines: DetailLine[];
  onLinesChange: (next: DetailLine[]) => void;
}) {
  const [types, setTypes] = useState<ConstructionTypeRow[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectReset, setSelectReset] = useState(0);
  const [toothOpen, setToothOpen] = useState(false);
  const [archOpen, setArchOpen] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState("");
  const [priceListOpen, setPriceListOpen] = useState(false);
  const [priceSearch, setPriceSearch] = useState("");
  const [priceItems, setPriceItems] = useState<PriceListApiRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rt, rm, rp] = await Promise.all([
          fetch("/api/construction-types"),
          fetch("/api/materials"),
          fetch("/api/price-list-items"),
        ]);
        if (!rt.ok) throw new Error("fail");
        const data = (await rt.json()) as ConstructionTypeRow[];
        if (!cancelled) setTypes(data);
        if (rm.ok) {
          const mats = (await rm.json()) as MaterialRow[];
          if (!cancelled) setMaterials(mats);
        }
        if (rp.ok) {
          const pl = (await rp.json()) as PriceListApiRow[];
          if (!cancelled) setPriceItems(pl);
        }
      } catch {
        if (!cancelled) setLoadError("Не удалось загрузить типы работ");
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

  const editingType = useMemo(
    () => types.find((t) => t.id === editingTypeId),
    [types, editingTypeId],
  );

  const openTypePicker = useCallback(
    (typeId: string) => {
      const t = types.find((x) => x.id === typeId);
      if (!t) return;
      setEditingTypeId(typeId);
      if (t.isArchWork) setArchOpen(true);
      else setToothOpen(true);
      setSelectReset((k) => k + 1);
    },
    [types],
  );

  const pickPriceItem = useCallback(
    (it: PriceListApiRow) => {
      onLinesChange([
        ...lines,
        {
          id: newDetailLineId(),
          kind: "priceList" as const,
          priceListItemId: it.id,
          label: `${it.code} · ${it.name}`,
          quantity: 1,
          unitPrice: it.priceRub,
        },
      ]);
      setPriceListOpen(false);
      setPriceSearch("");
    },
    [lines, onLinesChange],
  );

  const filteredPriceItems = useMemo(() => {
    const q = priceSearch.trim().toLowerCase();
    if (!q) return priceItems;
    return priceItems.filter(
      (it) =>
        it.code.toLowerCase().includes(q) ||
        it.name.toLowerCase().includes(q) ||
        (it.sectionTitle?.toLowerCase().includes(q) ?? false) ||
        (it.subsectionTitle?.toLowerCase().includes(q) ?? false),
    );
  }, [priceItems, priceSearch]);

  const onTypeSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      if (!id) return;
      openTypePicker(id);
    },
    [openTypePicker],
  );

  const removeLine = useCallback(
    (id: string) => {
      onLinesChange(lines.filter((l) => l.id !== id));
    },
    [lines, onLinesChange],
  );

  const patchLineFinance = useCallback(
    (lineId: string, patch: Partial<DetailFinanceFields>) => {
      onLinesChange(
        lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
      );
    },
    [lines, onLinesChange],
  );

  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(100px,120px)_1fr] sm:items-center">
        <label
          htmlFor={`detail-type-${selectReset}`}
          className="text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)] sm:text-base"
        >
          Тип
        </label>
        <select
          key={selectReset}
          id={`detail-type-${selectReset}`}
          className="w-full max-w-md rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)] shadow-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
          defaultValue=""
          onChange={onTypeSelectChange}
        >
          <option value="">Выберите тип</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.isArchWork ? " (дуга)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <button
          type="button"
          className="text-sm font-medium text-[var(--sidebar-blue)] underline hover:no-underline"
          onClick={() => setPriceListOpen(true)}
        >
          Добавить из прайса
        </button>
      </div>

      {lines.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-body)]">
            Назначено в наряде
          </h3>
          <ul className="space-y-2">
            {lines.map((line) => (
              <li
                key={line.id}
                className="space-y-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-2"
              >
                {line.kind === "priceList" ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 text-sm text-[var(--text-strong)]">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                          Прайс
                        </span>
                        <span className="text-[var(--text-body)]">
                          {": "}
                          {line.label ?? "позиция"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="text-sm text-[var(--text-muted)] underline hover:text-[var(--text-strong)]"
                        onClick={() => removeLine(line.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 text-sm text-[var(--text-strong)]">
                        <span className="font-semibold">
                          {typeNameById(line.constructionTypeId)}
                        </span>
                        {line.kind === "teeth" ? (
                          <span className="text-[var(--text-secondary)]">
                            {": "}
                            <span className="font-mono text-[var(--app-text)]">
                              {line.teethFdi.join(", ")}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[var(--text-secondary)]">
                            {": "}
                            {archLabelRu(line.arch)}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          className="text-sm font-medium text-[var(--sidebar-blue)] underline hover:no-underline"
                          onClick={() =>
                            openTypePicker(line.constructionTypeId)
                          }
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          className="text-sm text-[var(--text-muted)] underline hover:text-[var(--text-strong)]"
                          onClick={() => removeLine(line.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </>
                )}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Кол-во
                    <input
                      type="number"
                      min={1}
                      className={financeInputClass}
                      value={line.quantity ?? 1}
                      onChange={(e) =>
                        patchLineFinance(line.id, {
                          quantity: Math.max(
                            1,
                            parseInt(e.target.value, 10) || 1,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Цена ₽ / ед.
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className={financeInputClass}
                      value={line.unitPrice ?? ""}
                      placeholder="—"
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        patchLineFinance(line.id, {
                          unitPrice:
                            v === "" ? null : Math.max(0, Number(v) || 0),
                        });
                      }}
                    />
                  </label>
                  {line.kind !== "priceList" ? (
                    <>
                      <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Материал
                        <select
                          className={financeInputClass}
                          value={line.materialId ?? ""}
                          onChange={(e) =>
                            patchLineFinance(line.id, {
                              materialId: e.target.value || null,
                            })
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
                      <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Оттенок
                        <input
                          type="text"
                          className={financeInputClass}
                          value={line.shade ?? ""}
                          placeholder="—"
                          onChange={(e) =>
                            patchLineFinance(line.id, {
                              shade: e.target.value.trim() || null,
                            })
                          }
                        />
                      </label>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">
          Выберите тип работы — откроется окно выбора зубов или дуги.
        </p>
      )}

      {priceListOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="price-list-modal-title"
        >
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-2xl">
            <h2
              id="price-list-modal-title"
              className="text-base font-semibold text-[var(--app-text)]"
            >
              Позиция из прайса
            </h2>
            <input
              type="search"
              className="mt-3 rounded-md border border-[var(--input-border)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
              placeholder="Поиск по коду, названию, разделу…"
              value={priceSearch}
              onChange={(e) => setPriceSearch(e.target.value)}
              autoFocus
            />
            <div className="mt-3 flex min-h-0 min-h-[40vh] flex-1 flex-col">
              {filteredPriceItems.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  {priceItems.length === 0
                    ? "Прайс пуст. Импортируйте: npm run import:price"
                    : "Ничего не найдено"}
                </p>
              ) : (
                <PriceListTabbedBody
                  items={filteredPriceItems}
                  onPick={pickPriceItem}
                />
              )}
            </div>
            <div className="mt-4 flex justify-end border-t border-[var(--border-subtle)] pt-3">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                onClick={() => {
                  setPriceListOpen(false);
                  setPriceSearch("");
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ToothChartModal
        open={toothOpen}
        constructionTypeId={editingTypeId}
        typeName={editingType?.name ?? "…"}
        lines={lines}
        typeNameById={typeNameById}
        onClose={() => setToothOpen(false)}
        onCommit={onLinesChange}
      />

      <ArchWorkModal
        open={archOpen}
        constructionTypeId={editingTypeId}
        typeName={editingType?.name ?? "…"}
        lines={lines}
        onClose={() => setArchOpen(false)}
        onCommit={onLinesChange}
      />
    </div>
  );
}
