"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { OrderProstheticsV1, ProstheticsOurLine } from "@/lib/order-prosthetics";
import {
  PrefixSearchCombobox,
  type PrefixComboboxOption,
} from "@/components/ui/PrefixSearchCombobox";
import { comboboxSearchPrefixesFromText } from "@/lib/prefix-search-match";
import {
  ourLineSaleRub,
  ourLinesSaleTotalRub,
} from "@/lib/inventory/our-lines-sale-total";

type InvItem = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  isActive: boolean;
  warehouseId: string;
  quantityOnHand?: number;
  manufacturer?: string | null;
  saleUnitPriceRub?: number | null;
};

type WarehouseRow = {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
};

const rowInputClass =
  "w-full rounded border border-[var(--card-border)] bg-[var(--card-bg)] px-1.5 py-0.5 text-xs leading-tight text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]";
const rowCardClass =
  "flex flex-wrap items-end gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-1.5 py-1";
const rowLabelClass =
  "block text-[9px] font-medium uppercase leading-none text-[var(--text-muted)]";

function moneyRu(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(n);
}

function itemLabel(it: InvItem): string {
  const sku = it.sku?.trim();
  const qoh =
    typeof it.quantityOnHand === "number" && Number.isFinite(it.quantityOnHand)
      ? ` · ост. ${it.quantityOnHand}`
      : "";
  return `${sku ? `${sku} · ` : ""}${it.name} (${it.unit})${qoh}`;
}

export function OrderProstheticsBlock({
  value,
  onChange,
  idPrefix = "prosthetics",
  hideBlockTitle = false,
  onOurSaleTotalChange,
}: {
  value: OrderProstheticsV1;
  onChange: (next: OrderProstheticsV1) => void;
  idPrefix?: string;
  /** На экране наряда заголовок колонки уже задан снаружи — дубли не показываем. */
  hideBlockTitle?: boolean;
  /** Итог «наше» по цене реализации (без скидки). */
  onOurSaleTotalChange?: (rub: number) => void;
}) {
  const [items, setItems] = useState<InvItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [itemsRes, whRes] = await Promise.all([
          fetch("/api/inventory/items"),
          fetch("/api/inventory/warehouses"),
        ]);
        if (!itemsRes.ok || !whRes.ok) throw new Error("fail");
        const itemRows = (await itemsRes.json()) as InvItem[];
        const whRows = (await whRes.json()) as WarehouseRow[];
        if (cancelled) return;
        setItems(
          itemRows.filter(
            (x) => x.isActive && String(x.warehouseId || "").trim().length > 0,
          ),
        );
        setWarehouses(whRows.filter((w) => w.isActive));
        setLoadError(null);
      } catch {
        if (!cancelled) {
          setLoadError("Не удалось загрузить склады / позиции");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const defaultWarehouseId = useMemo(() => {
    const d = warehouses.find((w) => w.isDefault);
    return d?.id ?? warehouses[0]?.id ?? "";
  }, [warehouses]);

  const warehouseOptions = useMemo((): PrefixComboboxOption[] => {
    return warehouses.map((w) => ({
      value: w.id,
      label: w.name,
      searchPrefixes: comboboxSearchPrefixesFromText(w.name),
    }));
  }, [warehouses]);

  const setClientLines = useCallback(
    (clientProvided: OrderProstheticsV1["clientProvided"]) => {
      onChange({ ...value, clientProvided });
    },
    [onChange, value],
  );

  const setOurLines = useCallback(
    (ourLines: OrderProstheticsV1["ourLines"]) => {
      onChange({ ...value, ourLines });
    },
    [onChange, value],
  );

  const addClientRow = () => {
    setClientLines([
      ...value.clientProvided,
      { description: "", quantity: 1 },
    ]);
  };

  const patchClientRow = (
    index: number,
    patch: Partial<{ description: string; quantity: number }>,
  ) => {
    setClientLines(
      value.clientProvided.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    );
  };

  const removeClientRow = (index: number) => {
    setClientLines(value.clientProvided.filter((_, i) => i !== index));
  };

  const addOurRow = () => {
    const line: ProstheticsOurLine = {
      inventoryItemId: "",
      quantity: 1,
    };
    if (defaultWarehouseId) line.warehouseId = defaultWarehouseId;
    setOurLines([...value.ourLines, line]);
  };

  const patchOurRow = (index: number, patch: Partial<ProstheticsOurLine>) => {
    setOurLines(
      value.ourLines.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        if (
          patch.warehouseId !== undefined &&
          patch.warehouseId !== row.warehouseId
        ) {
          const keepItem = items.find(
            (it) =>
              it.id === next.inventoryItemId &&
              it.warehouseId === patch.warehouseId,
          );
          if (!keepItem) next.inventoryItemId = "";
        }
        if (patch.inventoryItemId) {
          const it = items.find((x) => x.id === patch.inventoryItemId);
          if (it?.warehouseId) next.warehouseId = it.warehouseId;
        }
        return next;
      }),
    );
  };

  const removeOurRow = (index: number) => {
    setOurLines(value.ourLines.filter((_, i) => i !== index));
  };

  const ourSaleTotalRub = useMemo(
    () => ourLinesSaleTotalRub(value.ourLines, items),
    [items, value.ourLines],
  );

  useEffect(() => {
    onOurSaleTotalChange?.(ourSaleTotalRub);
  }, [onOurSaleTotalChange, ourSaleTotalRub]);

  const itemOptionsForWarehouse = useCallback(
    (warehouseId: string): PrefixComboboxOption[] => {
      const wh = warehouseId.trim();
      if (!wh) return [];
      return items
        .filter((it) => it.warehouseId === wh)
        .map((it) => ({
          value: it.id,
          label: itemLabel(it),
          searchPrefixes: comboboxSearchPrefixesFromText(
            it.name,
            it.sku,
            it.manufacturer,
          ),
        }));
    },
    [items],
  );

  return (
    <div className="space-y-5 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-4">
      {!hideBlockTitle ? (
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-strong)]">
          Протетика
        </h3>
      ) : null}

      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
          Предоставлено клиентом
        </h4>
        {value.clientProvided.length === 0 ? null : (
          <ul className="space-y-1">
            {value.clientProvided.map((row, i) => (
              <li
                key={`${idPrefix}-c-${i}`}
                className={rowCardClass}
              >
                <label className="min-w-[160px] flex-1">
                  <span className={rowLabelClass}>
                    Что
                  </span>
                  <input
                    type="text"
                    className={`${rowInputClass} mt-px`}
                    value={row.description}
                    onChange={(e) =>
                      patchClientRow(i, { description: e.target.value })
                    }
                    placeholder="Напр. временные коронки, балка…"
                  />
                </label>
                <label className="w-24">
                  <span className={rowLabelClass}>
                    Кол-во
                  </span>
                  <input
                    type="number"
                    min={1}
                    className={`${rowInputClass} mt-px tabular-nums`}
                    value={row.quantity}
                    onChange={(e) =>
                      patchClientRow(i, {
                        quantity: Math.max(
                          1,
                          parseInt(e.target.value, 10) || 1,
                        ),
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="mb-px text-xs text-[var(--text-muted)] underline hover:text-[var(--text-strong)]"
                  onClick={() => removeClientRow(i)}
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="text-xs font-semibold uppercase text-[var(--sidebar-blue)] underline hover:no-underline"
          onClick={addClientRow}
        >
          + строка
        </button>
      </div>

      <div className="space-y-3 border-t border-[var(--card-border)] pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
            Наше (со склада)
          </h4>
          {value.ourLines.length > 0 ? (
            <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--text-strong)]">
              {moneyRu(ourSaleTotalRub)}
            </span>
          ) : null}
        </div>
        {loadError ? (
          <p className="text-xs text-amber-800">{loadError}</p>
        ) : null}
        {warehouses.length === 0 && !loadError ? (
          <p className="text-xs text-[var(--text-muted)]">
            Нет складов.{" "}
            <Link
              href="/directory/warehouse"
              className="text-[var(--sidebar-blue)] hover:underline"
            >
              Справочник
            </Link>
          </p>
        ) : null}
        {value.ourLines.length === 0 ? null : (
          <ul className="space-y-1">
            {value.ourLines.map((row, i) => {
              const whId = (
                row.warehouseId ||
                items.find((x) => x.id === row.inventoryItemId)?.warehouseId ||
                ""
              ).trim();
              const posOpts = itemOptionsForWarehouse(whId);
              const lineSum = ourLineSaleRub(row, items);
              return (
                <li
                  key={`${idPrefix}-o-${i}`}
                  className={rowCardClass}
                >
                  <div className="min-w-[140px] flex-1">
                    <span
                      className={rowLabelClass}
                      id={`${idPrefix}-wh-lbl-${i}`}
                    >
                      Склад
                    </span>
                    <div className="mt-px">
                      <PrefixSearchCombobox
                        aria-labelledby={`${idPrefix}-wh-lbl-${i}`}
                        options={warehouseOptions}
                        value={whId}
                        onChange={(v) => patchOurRow(i, { warehouseId: v })}
                        placeholder="Склад…"
                        emptyOptionLabel="Выберите склад"
                        className={rowInputClass}
                      />
                    </div>
                  </div>
                  <div className="min-w-[200px] flex-[2]">
                    <span
                      className={rowLabelClass}
                      id={`${idPrefix}-pos-lbl-${i}`}
                    >
                      Позиция склада
                    </span>
                    <div className="mt-px">
                      <PrefixSearchCombobox
                        aria-labelledby={`${idPrefix}-pos-lbl-${i}`}
                        options={posOpts}
                        value={row.inventoryItemId}
                        onChange={(v) =>
                          patchOurRow(i, { inventoryItemId: v })
                        }
                        placeholder={
                          whId
                            ? "Артикул или название…"
                            : "Сначала выберите склад"
                        }
                        disabled={!whId || posOpts.length === 0}
                        emptyOptionLabel="Выберите позицию"
                        className={rowInputClass}
                      />
                    </div>
                  </div>
                  <label className="w-24">
                    <span className={rowLabelClass}>
                      Кол-во
                    </span>
                    <input
                      type="number"
                      min={1}
                      className={`${rowInputClass} mt-px tabular-nums`}
                      value={row.quantity}
                      onChange={(e) =>
                        patchOurRow(i, {
                          quantity: Math.max(
                            1,
                            parseInt(e.target.value, 10) || 1,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="mb-px text-xs text-[var(--text-muted)] underline hover:text-[var(--text-strong)]"
                    onClick={() => removeOurRow(i)}
                  >
                    Удалить
                  </button>
                  <span className="mb-px min-w-[4.5rem] text-right text-xs font-semibold tabular-nums text-[var(--text-strong)]">
                    {lineSum == null ? "—" : moneyRu(lineSum)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <button
          type="button"
          disabled={warehouses.length === 0}
          className="text-xs font-semibold uppercase text-[var(--sidebar-blue)] underline hover:no-underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
          onClick={addOurRow}
        >
          + строка
        </button>
      </div>
    </div>
  );
}
