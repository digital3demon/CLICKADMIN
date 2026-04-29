"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { OrderProstheticsV1 } from "@/lib/order-prosthetics";

type InvItem = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  isActive: boolean;
};

const rowInputClass =
  "w-full rounded border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-xs text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]";

export function OrderProstheticsBlock({
  value,
  onChange,
  idPrefix = "prosthetics",
  hideBlockTitle = false,
}: {
  value: OrderProstheticsV1;
  onChange: (next: OrderProstheticsV1) => void;
  idPrefix?: string;
  /** На экране наряда заголовок колонки уже задан снаружи — дубли не показываем. */
  hideBlockTitle?: boolean;
}) {
  const [items, setItems] = useState<InvItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/inventory/items");
        if (!res.ok) throw new Error("fail");
        const rows = (await res.json()) as InvItem[];
        if (!cancelled) {
          setItems(rows.filter((x) => x.isActive));
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Не удалось загрузить позиции склада");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    const firstId = items[0]?.id ?? "";
    setOurLines([
      ...value.ourLines,
      { inventoryItemId: firstId, quantity: 1 },
    ]);
  };

  const patchOurRow = (
    index: number,
    patch: Partial<{ inventoryItemId: string; quantity: number }>,
  ) => {
    setOurLines(
      value.ourLines.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    );
  };

  const removeOurRow = (index: number) => {
    setOurLines(value.ourLines.filter((_, i) => i !== index));
  };

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
          <ul className="space-y-2">
            {value.clientProvided.map((row, i) => (
              <li
                key={`${idPrefix}-c-${i}`}
                className="flex flex-wrap items-end gap-2 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] p-2"
              >
                <label className="min-w-[160px] flex-1">
                  <span className="text-[10px] font-medium uppercase text-[var(--text-muted)]">
                    Что
                  </span>
                  <input
                    type="text"
                    className={`${rowInputClass} mt-0.5`}
                    value={row.description}
                    onChange={(e) =>
                      patchClientRow(i, { description: e.target.value })
                    }
                    placeholder="Напр. временные коронки, балка…"
                  />
                </label>
                <label className="w-24">
                  <span className="text-[10px] font-medium uppercase text-[var(--text-muted)]">
                    Кол-во
                  </span>
                  <input
                    type="number"
                    min={1}
                    className={`${rowInputClass} mt-0.5 tabular-nums`}
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
                  className="mb-0.5 text-xs text-[var(--text-muted)] underline hover:text-[var(--text-strong)]"
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
        <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
          Наше (со склада)
        </h4>
        {loadError ? (
          <p className="text-xs text-amber-800">{loadError}</p>
        ) : null}
        {items.length === 0 && !loadError ? (
          <p className="text-xs text-[var(--text-muted)]">
            Нет позиций склада.{" "}
            <Link
              href="/directory/warehouse"
              className="text-[var(--sidebar-blue)] hover:underline"
            >
              Справочник
            </Link>
          </p>
        ) : null}
        {value.ourLines.length === 0 ? null : (
          <ul className="space-y-2">
            {value.ourLines.map((row, i) => (
              <li
                key={`${idPrefix}-o-${i}`}
                className="flex flex-wrap items-end gap-2 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] p-2"
              >
                <label className="min-w-[200px] flex-1">
                  <span className="text-[10px] font-medium uppercase text-[var(--text-muted)]">
                    Позиция склада
                  </span>
                  <select
                    className={`${rowInputClass} mt-0.5`}
                    value={row.inventoryItemId}
                    onChange={(e) =>
                      patchOurRow(i, { inventoryItemId: e.target.value })
                    }
                  >
                    {items.length === 0 ? (
                      <option value="">—</option>
                    ) : null}
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.sku ? `${it.sku} · ` : ""}
                        {it.name} ({it.unit})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="w-24">
                  <span className="text-[10px] font-medium uppercase text-[var(--text-muted)]">
                    Кол-во
                  </span>
                  <input
                    type="number"
                    min={1}
                    className={`${rowInputClass} mt-0.5 tabular-nums`}
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
                  className="mb-0.5 text-xs text-[var(--text-muted)] underline hover:text-[var(--text-strong)]"
                  onClick={() => removeOurRow(i)}
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={items.length === 0}
          className="text-xs font-semibold uppercase text-[var(--sidebar-blue)] underline hover:no-underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
          onClick={addOurRow}
        >
          + строка
        </button>
      </div>
    </div>
  );
}
