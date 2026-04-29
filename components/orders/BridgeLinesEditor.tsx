"use client";

import { useCallback, useEffect, useState } from "react";
import type { BridgeLineInput } from "@/lib/detail-lines-to-constructions";

type MaterialRow = { id: string; name: string };

const inp =
  "w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]";

export function BridgeLinesEditor({
  value,
  onChange,
}: {
  value: BridgeLineInput[];
  onChange: (next: BridgeLineInput[]) => void;
}) {
  const [materials, setMaterials] = useState<MaterialRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/materials");
        if (!res.ok) return;
        const data = (await res.json()) as MaterialRow[];
        if (!cancelled) setMaterials(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addRow = useCallback(() => {
    onChange([
      ...value,
      {
        bridgeFromFdi: "",
        bridgeToFdi: "",
        constructionTypeId: null,
        quantity: 1,
        unitPrice: null,
        materialId: null,
        shade: null,
      },
    ]);
  }, [value, onChange]);

  const removeRow = useCallback(
    (idx: number) => {
      onChange(value.filter((_, i) => i !== idx));
    },
    [value, onChange],
  );

  const patch = useCallback(
    (idx: number, patch: Partial<BridgeLineInput>) => {
      onChange(
        value.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
      );
    },
    [value, onChange],
  );

  return (
    <div className="space-y-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-strong)]">Мосты</h3>
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--surface-hover)]"
        >
          + Мост
        </button>
      </div>
      {value.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">
          Нет мостов. Добавьте при необходимости.
        </p>
      ) : (
        <ul className="space-y-3">
          {value.map((r, idx) => (
            <li
              key={idx}
              className="grid gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)]">
                От (FDI)
                <input
                  className={inp}
                  value={r.bridgeFromFdi}
                  onChange={(e) =>
                    patch(idx, { bridgeFromFdi: e.target.value.trim() })
                  }
                  placeholder="47"
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)]">
                До (FDI)
                <input
                  className={inp}
                  value={r.bridgeToFdi}
                  onChange={(e) =>
                    patch(idx, { bridgeToFdi: e.target.value.trim() })
                  }
                  placeholder="37"
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)]">
                Кол-во
                <input
                  type="number"
                  min={1}
                  className={inp}
                  value={r.quantity ?? 1}
                  onChange={(e) =>
                    patch(idx, {
                      quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)]">
                Цена ₽ / ед.
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={inp}
                  value={r.unitPrice ?? ""}
                  placeholder="—"
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    patch(idx, {
                      unitPrice: v === "" ? null : Math.max(0, Number(v) || 0),
                    });
                  }}
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)] sm:col-span-2">
                Материал
                <select
                  className={inp}
                  value={r.materialId ?? ""}
                  onChange={(e) =>
                    patch(idx, { materialId: e.target.value || null })
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
                  value={r.shade ?? ""}
                  onChange={(e) =>
                    patch(idx, { shade: e.target.value.trim() || null })
                  }
                  placeholder="—"
                />
              </label>
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="text-xs text-red-600 underline hover:text-red-800"
                >
                  Удалить мост
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
