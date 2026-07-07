"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { UserRole } from "@prisma/client";
import { USER_ROLE_LABELS } from "@/lib/user-role-labels";
import {
  BUNDLE_MATRIX_GROUPS,
  isClickMigOwnerOnlyBundle,
  ROLES_IN_ACCESS_MATRIX,
} from "@/lib/role-module-defaults";
import {
  childBundlesOf,
  requiredParentBundle,
  type BundleId,
} from "@/lib/role-module-bundles";

type BundleRow = { id: BundleId; label: string };

type LoadPayload = {
  bundles: BundleRow[];
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
        bundles: j.bundles,
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

  const bundleById = useMemo(() => {
    const map = new Map<BundleId, BundleRow>();
    for (const b of data?.bundles ?? []) {
      map.set(b.id, b);
    }
    return map;
  }, [data?.bundles]);

  const setCell = async (role: UserRole, bundle: BundleId, allowed: boolean) => {
    const key = `${role}:${bundle}`;
    setSaving(key);
    setError(null);
    try {
      const res = await fetch("/api/role-module-access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, bundle, allowed }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Сохранение не удалось");
        await load();
        return;
      }
      setData((prev) => {
        if (!prev) return prev;
        const nextRole = { ...prev.effective[role], [bundle]: allowed };
        if (allowed) {
          let p = requiredParentBundle(bundle);
          while (p) {
            nextRole[p] = true;
            p = requiredParentBundle(p);
          }
        } else {
          for (const child of childBundlesOf(bundle)) {
            nextRole[child] = false;
          }
        }
        return {
          ...prev,
          effective: {
            ...prev.effective,
            [role]: nextRole,
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

  const renderBundleRow = (b: BundleRow) => (
    <tr
      key={b.id}
      className="border-b border-[var(--border-subtle)] last:border-b-0"
    >
      <td className="max-w-[14rem] px-2 py-1.5 text-[var(--app-text)]">
        {b.label}
      </td>
      {ROLES_IN_ACCESS_MATRIX.map((r) => {
        const on = data!.effective[r]?.[b.id] === true;
        const busy = saving === `${r}:${b.id}`;
        const parent = requiredParentBundle(b.id);
        const parentOn = parent ? data!.effective[r]?.[parent] === true : true;
        const gatedByParent = parent != null && !parentOn;
        const clickMigOwnerOnly = isClickMigOwnerOnlyBundle(b.id);
        const impliedByChild =
          !on &&
          childBundlesOf(b.id).some((c) => data!.effective[r]?.[c] === true);
        const cellDisabled =
          busy || gatedByParent || clickMigOwnerOnly || impliedByChild;
        const cellTitle = clickMigOwnerOnly
          ? "КликМиг временно только у владельца (OWNER)."
          : gatedByParent && parent
            ? `Сначала включите «${bundleById.get(parent)?.label ?? parent}».`
            : impliedByChild
              ? "Включено через дочерний пакет — отключите его сначала."
              : undefined;
        return (
          <td key={r} className="p-1 text-center align-middle">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              checked={on || impliedByChild}
              disabled={cellDisabled}
              title={cellTitle}
              onChange={(e) => {
                void setCell(r, b.id, e.target.checked);
              }}
              aria-label={`${USER_ROLE_LABELS[r]} — ${b.label}`}
            />
          </td>
        );
      })}
    </tr>
  );

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
        Пакеты прав: канбан — 3 уровня (доски → работа → координация), заказы —
        просмотр с чатом, ведение, общие уведомления. Персональные @ник — без
        галочки. «Прочитано» @лаборатория — только админы. У владельца полный
        доступ.
      </p>
      <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-[var(--surface-muted)]">
              <th className="px-2 py-2 text-xs font-semibold text-[var(--text-muted)]">
                Пакет
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
            {BUNDLE_MATRIX_GROUPS.map((group) => {
              const rows = group.bundles
                .map((id) => bundleById.get(id))
                .filter((b): b is BundleRow => Boolean(b));
              if (rows.length === 0) return null;
              return (
                <Fragment key={`hdr-${group.id}`}>
                  <tr className="border-b border-[var(--card-border)] bg-[color-mix(in_srgb,var(--surface-muted)_70%,transparent)]">
                    <td
                      colSpan={1 + ROLES_IN_ACCESS_MATRIX.length}
                      className="px-2 py-2"
                    >
                      <div className="text-xs font-bold uppercase tracking-wide text-[var(--text-body)]">
                        {group.title}
                      </div>
                      {group.description ? (
                        <p className="mt-0.5 text-[0.68rem] font-normal normal-case text-[var(--text-muted)]">
                          {group.description}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                  {rows.map((b) => renderBundleRow(b))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
