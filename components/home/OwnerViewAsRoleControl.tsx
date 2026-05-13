"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { UserRole } from "@prisma/client";
import { INVITABLE_ROLES, USER_ROLE_LABELS } from "@/lib/user-role-labels";

type Props = {
  currentRole: UserRole;
};

export function OwnerViewAsRoleControl({ currentRole }: Props) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    currentRole === "OWNER" ? "ADMINISTRATOR" : currentRole,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isViewAsActive = currentRole !== "OWNER";

  const applyRole = (role: UserRole) => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/view-as-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось переключить роль");
        return;
      }
      router.refresh();
      window.location.reload();
    });
  };

  return (
    <section
      aria-label="Показать CRM как"
      className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="text-sm font-semibold text-[var(--text-strong)]">
          Показать CRM как
        </label>
        <select
          value={selectedRole}
          disabled={isPending}
          onChange={(event) => setSelectedRole(event.target.value as UserRole)}
          className="min-w-0 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none sm:min-w-[15rem]"
        >
          {INVITABLE_ROLES.map((role) => (
            <option key={role} value={role}>
              {USER_ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={isPending}
          onClick={() => applyRole(selectedRole)}
          className="rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Показать
        </button>
        <button
          type="button"
          disabled={isPending || !isViewAsActive}
          onClick={() => applyRole("OWNER")}
          className="rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-semibold text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Сброс до владельца
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">
        Сейчас: {USER_ROLE_LABELS[currentRole]}
        {isViewAsActive ? " (режим просмотра владельца)" : ""}
      </p>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
