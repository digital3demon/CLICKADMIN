"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppModule, UserRole } from "@prisma/client";
import { USER_ROLE_LABELS } from "@/lib/user-role-labels";
import { ROLES_IN_ACCESS_MATRIX } from "@/lib/role-module-defaults";

type ModRow = { id: AppModule; label: string };

type LoadPayload = {
  modules: ModRow[];
  roles: UserRole[];
  effective: Record<string, Record<string, boolean>>;
};

export function RoleModuleAccessMatrix() {
  const [data, setData] = useState<LoadPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/role-module-access", { cache: "no-store" });
      const j = (await res.json()) as LoadPayload & { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Не удалось загрузить");
        setData(null);
        return;
      }
      setData({
        modules: j.modules,
        roles: j.roles,
        effective: j.effective,
      });
    } catch {
      setError("Сеть недоступна");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setCell = async (role: UserRole, module: AppModule, allowed: boolean) => {
    const key = `${role}:${module}`;
    setSaving(key);
    setError(null);
    try {
      const res = await fetch("/api/role-module-access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, module, allowed }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Сохранение не удалось");
        await load();
        return;
      }
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          effective: {
            ...prev.effective,
            [role]: { ...prev.effective[role], [module]: allowed },
          },
        };
      });
    } catch {
      setError("Сеть недоступна");
      await load();
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">Загрузка…</p>;
  }
  if (error && !data) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
    );
  }
  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-amber-700 dark:text-amber-200">{error}</p>
      ) : null}
      <p className="text-sm text-[var(--text-secondary)]">
        Снимите галочку, чтобы отключить модуль для роли, или включите, чтобы
        разрешить. Состояние «как в таблице по умолчанию» — это то же самое, что
        в CRM изначально для этой роли. У владельца неизменяемо полный доступ.
      </p>
      <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-[var(--surface-muted)]">
              <th className="px-2 py-2 text-xs font-semibold text-[var(--text-muted)]">
                Модуль
              </th>
              {ROLES_IN_ACCESS_MATRIX.map((r) => (
                <th
                  key={r}
                  className="whitespace-nowrap px-1 py-2 text-center text-xs font-medium text-[var(--text-body)]"
                >
                  {USER_ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.modules.map((m) => (
              <tr
                key={m.id}
                className="border-b border-[var(--border-subtle)] last:border-b-0"
              >
                <td className="max-w-[12rem] px-2 py-1.5 text-[var(--app-text)]">
                  {m.label}
                </td>
                {ROLES_IN_ACCESS_MATRIX.map((r) => {
                  const on = data.effective[r]?.[m.id] === true;
                  const busy = saving === `${r}:${m.id}`;
                  return (
                    <td key={r} className="p-1 text-center align-middle">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer disabled:cursor-wait"
                        checked={on}
                        disabled={busy}
                        onChange={(e) => {
                          void setCell(r, m.id, e.target.checked);
                        }}
                        aria-label={`${USER_ROLE_LABELS[r]} — ${m.label}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
