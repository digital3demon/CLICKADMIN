"use client";

import { useCallback, useEffect, useState } from "react";

type CourierRow = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export function CouriersDirectoryClient() {
  const [rows, setRows] = useState<CourierRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newSort, setNewSort] = useState("0");
  const [msg, setMsg] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    const res = await fetch("/api/couriers?all=1");
    const data = (await res.json()) as CourierRow[] | { error?: string };
    if (!res.ok) {
      throw new Error(
        typeof data === "object" && data && "error" in data
          ? String(data.error)
          : "Ошибка загрузки",
      );
    }
    setRows(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    setLoadError(null);
    void loadRows().catch((e) => {
      setLoadError(e instanceof Error ? e.message : "Ошибка загрузки");
    });
  }, [loadRows]);

  async function addRow(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const so = Number.parseInt(newSort, 10);
    const res = await fetch("/api/couriers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        sortOrder: Number.isFinite(so) ? so : 0,
        isActive: true,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMsg(data.error ?? "Не создано");
      return;
    }
    setNewName("");
    setNewSort("0");
    await loadRows();
  }

  async function patchRow(id: string, patch: Record<string, unknown>) {
    setMsg(null);
    const res = await fetch(`/api/couriers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMsg(data.error ?? "Не сохранено");
      return;
    }
    await loadRows();
  }

  return (
    <div className="space-y-8">
      {loadError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {loadError}
        </p>
      ) : null}
      {msg ? <p className="text-sm text-red-600">{msg}</p> : null}

      <section>
        <h2 className="text-lg font-semibold text-[var(--app-text)]">Курьеры</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Справочник для выбора в наряде. Неактивные не показываются в списке
          заказа, но остаются в старых нарядах.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--card-border)]">
          <table className="min-w-[520px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
                <th className="px-3 py-2">Название</th>
                <th className="px-3 py-2">Порядок</th>
                <th className="px-3 py-2">Активен</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border-subtle)]">
                  <td className="px-3 py-2">
                    <input
                      className="w-full max-w-md rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-sm"
                      defaultValue={r.name}
                      key={`${r.id}-name-${r.name}`}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== r.name) void patchRow(r.id, { name: v });
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="w-20 rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-sm tabular-nums"
                      defaultValue={r.sortOrder}
                      key={`${r.id}-sort-${r.sortOrder}`}
                      onBlur={(e) => {
                        const n = Number.parseInt(e.target.value, 10);
                        if (Number.isFinite(n) && n !== r.sortOrder) {
                          void patchRow(r.id, { sortOrder: n });
                        }
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        defaultChecked={r.isActive}
                        onChange={(e) =>
                          void patchRow(r.id, { isActive: e.target.checked })
                        }
                      />
                      Активен
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form
          onSubmit={addRow}
          className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--surface-muted)] p-4"
        >
          <div className="min-w-[12rem] flex-1">
            <label className="text-xs font-semibold uppercase text-[var(--text-muted)]">
              Новый курьер
            </label>
            <input
              className="mt-1 w-full rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Название / ФИО"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-[var(--text-muted)]">
              Порядок
            </label>
            <input
              type="number"
              className="mt-1 w-24 rounded border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm tabular-nums"
              value={newSort}
              onChange={(e) => setNewSort(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          >
            Добавить
          </button>
        </form>
      </section>
    </div>
  );
}
