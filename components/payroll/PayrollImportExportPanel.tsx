"use client";

import { useMemo, useRef, useState } from "react";

type StaffRole = { id: string; name: string };
type PriceItem = { id: string; code: string; name: string };

export type FreeformImportDraftRow = {
  key: string;
  name: string;
  amountRub: number;
  staffRoleIds: string[];
  priceListItemIds: string[];
  skip: boolean;
  sheet?: string;
  row?: number;
};

type PreviewCandidate = {
  name?: string;
  amountRub?: number;
  sheet?: string;
  row?: number;
};

type Props = {
  staffRoles: StaffRole[];
  priceItems: PriceItem[];
  onApplied: () => void;
};

function parseAmount(value: string, fallback: number): number {
  const n = Number.parseInt(value.replace(/\s/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function PayrollImportExportPanel({
  staffRoles,
  priceItems,
  onApplied,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [draftRows, setDraftRows] = useState<FreeformImportDraftRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [priceQuery, setPriceQuery] = useState("");

  const filteredPrices = useMemo(() => {
    const q = priceQuery.trim().toLowerCase();
    if (!q) return priceItems.slice(0, 40);
    return priceItems
      .filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [priceItems, priceQuery]);

  const uploadPreview = async (file: File) => {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/payroll/config/import/preview", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        candidates?: PreviewCandidate[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Не удалось разобрать файл");
      const candidates = Array.isArray(data.candidates) ? data.candidates : [];
      if (candidates.length === 0) {
        setDraftRows([]);
        setError("В файле не найдено пар «название + сумма»");
        return;
      }
      setDraftRows(
        candidates.map((c, i) => ({
          key: `${c.sheet ?? "sheet"}-${c.row ?? i}-${c.name ?? ""}-${i}`,
          name: String(c.name ?? "").trim() || `Строка ${i + 1}`,
          amountRub:
            typeof c.amountRub === "number" && c.amountRub > 0
              ? Math.round(c.amountRub)
              : 0,
          staffRoleIds: [],
          priceListItemIds: [],
          skip: false,
          sheet: typeof c.sheet === "string" ? c.sheet : undefined,
          row: typeof c.row === "number" ? c.row : undefined,
        })),
      );
    } catch (e) {
      setDraftRows([]);
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  const applyRows = async () => {
    setApplying(true);
    setError(null);
    setOk(null);
    try {
      const rows = draftRows.map((r) => ({
        name: r.name.trim(),
        amountRub: r.amountRub,
        staffRoleIds: r.staffRoleIds,
        priceListItemIds: r.priceListItemIds,
        skip: r.skip || !r.name.trim() || r.amountRub <= 0,
      }));
      const active = rows.filter((r) => !r.skip);
      if (active.length === 0) {
        throw new Error("Нет строк для применения (все пропущены или пустые)");
      }
      const res = await fetch("/api/payroll/config/import/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = (await res.json()) as {
        error?: string;
        created?: number;
        skipped?: number;
      };
      if (!res.ok) throw new Error(data.error || "Импорт не выполнен");
      setOk(
        `Импорт выполнен: создано ${data.created ?? active.length}, пропущено ${data.skipped ?? rows.length - active.length}.`,
      );
      setDraftRows([]);
      if (fileRef.current) fileRef.current.value = "";
      onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка импорта");
    } finally {
      setApplying(false);
    }
  };

  const patchRow = (key: string, patch: Partial<FreeformImportDraftRow>) => {
    setDraftRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  };

  const toggleRole = (key: string, roleId: string) => {
    setDraftRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const has = r.staffRoleIds.includes(roleId);
        return {
          ...r,
          staffRoleIds: has
            ? r.staffRoleIds.filter((id) => id !== roleId)
            : [...r.staffRoleIds, roleId],
        };
      }),
    );
  };

  const togglePrice = (key: string, priceId: string) => {
    setDraftRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const has = r.priceListItemIds.includes(priceId);
        return {
          ...r,
          priceListItemIds: has
            ? r.priceListItemIds.filter((id) => id !== priceId)
            : [...r.priceListItemIds, priceId],
        };
      }),
    );
  };

  const inputCls =
    "w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--sidebar-blue)]";

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
      <h2 className="text-base font-semibold text-[var(--text-strong)]">
        Импорт из Excel (свободный)
      </h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Загрузите .xlsx: система найдёт пары «название + сумма». Роли и позиции
        прайса назначьте в таблице превью (без ролей = общий ФОТ).
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
          {loading ? "Чтение…" : "Загрузить Excel"}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadPreview(f);
            }}
          />
        </label>
        {draftRows.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setDraftRows([]);
              setError(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="rounded-md border border-[var(--input-border)] px-3 py-2 text-sm text-[var(--text-strong)]"
          >
            Очистить превью
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {ok}
        </p>
      ) : null}

      {draftRows.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Найдено строк: {draftRows.length}. Отметьте «Пропуск», чтобы не
            создавать ФОТ.
          </p>

          <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface-subtle)] text-xs uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="px-2 py-2">Пропуск</th>
                  <th className="px-2 py-2">Название</th>
                  <th className="px-2 py-2">Сумма ₽</th>
                  <th className="px-2 py-2">Роли</th>
                  <th className="px-2 py-2">Прайс (опц.)</th>
                  <th className="px-2 py-2">Лист</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {draftRows.map((row) => (
                  <tr
                    key={row.key}
                    className={row.skip ? "opacity-50" : "bg-emerald-500/5"}
                  >
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={row.skip}
                        onChange={(e) =>
                          patchRow(row.key, { skip: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-[var(--input-border)]"
                      />
                    </td>
                    <td className="min-w-[160px] px-2 py-2">
                      <input
                        className={inputCls}
                        value={row.name}
                        onChange={(e) =>
                          patchRow(row.key, { name: e.target.value })
                        }
                      />
                    </td>
                    <td className="min-w-[100px] px-2 py-2">
                      <input
                        className={inputCls}
                        inputMode="numeric"
                        value={row.amountRub || ""}
                        onChange={(e) =>
                          patchRow(row.key, {
                            amountRub: parseAmount(
                              e.target.value,
                              row.amountRub,
                            ),
                          })
                        }
                      />
                    </td>
                    <td className="min-w-[180px] px-2 py-2">
                      <div className="flex max-h-24 flex-col gap-1 overflow-y-auto">
                        {staffRoles.length === 0 ? (
                          <span className="text-xs text-[var(--text-muted)]">
                            Общий
                          </span>
                        ) : (
                          staffRoles.map((role) => (
                            <label
                              key={role.id}
                              className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text-strong)]"
                            >
                              <input
                                type="checkbox"
                                checked={row.staffRoleIds.includes(role.id)}
                                onChange={() => toggleRole(row.key, role.id)}
                                className="h-3.5 w-3.5 rounded border-[var(--input-border)]"
                              />
                              {role.name}
                            </label>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="min-w-[220px] px-2 py-2">
                      <input
                        className={`${inputCls} mb-1`}
                        value={priceQuery}
                        onChange={(e) => setPriceQuery(e.target.value)}
                        placeholder="Поиск прайса…"
                      />
                      <div className="max-h-24 overflow-y-auto text-xs">
                        {filteredPrices.map((p) => (
                          <label
                            key={p.id}
                            className="flex cursor-pointer items-start gap-1.5 py-0.5 text-[var(--text-strong)]"
                          >
                            <input
                              type="checkbox"
                              checked={row.priceListItemIds.includes(p.id)}
                              onChange={() => togglePrice(row.key, p.id)}
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[var(--input-border)]"
                            />
                            <span>
                              {p.code} · {p.name}
                            </span>
                          </label>
                        ))}
                      </div>
                      {row.priceListItemIds.length > 0 ? (
                        <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                          Выбрано: {row.priceListItemIds.length}
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-xs text-[var(--text-muted)]">
                      {row.sheet ?? "—"}
                      {row.row != null ? ` · ${row.row}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--card-border)] pt-3">
            <button
              type="button"
              disabled={applying}
              onClick={() => void applyRows()}
              className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              {applying ? "Применение…" : "Применить импорт"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
