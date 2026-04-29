"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ContractorDeletedNotice({
  variant,
  id,
  title,
  deletedAtIso,
}: {
  variant: "clinic" | "doctor";
  id: string;
  title: string;
  deletedAtIso: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restore = async () => {
    setBusy(true);
    setError(null);
    const path =
      variant === "clinic"
        ? `/api/clinics/${id}/restore`
        : `/api/doctors/${id}/restore`;
    try {
      const res = await fetch(path, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Ошибка");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Сеть недоступна");
      setBusy(false);
    }
  };

  const deletedAt = new Date(deletedAtIso);
  const label = title.split("\n")[0]?.trim() || title;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-6 shadow-sm">
      <p className="text-sm font-semibold text-amber-950">
        {variant === "clinic" ? "Клиника удалена" : "Врач удалён"}
      </p>
      <p className="mt-2 text-sm text-amber-900/95">
        «{label}» скрыта из списков с{" "}
        {Number.isNaN(deletedAt.getTime())
          ? "—"
          : deletedAt.toLocaleString("ru-RU", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
        . Данные и связи с нарядами сохранены.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          onClick={() => void restore()}
        >
          {busy ? "Восстановление…" : "Восстановить"}
        </button>
        <Link
          href="/clients/history"
          className="inline-flex items-center rounded-md border border-amber-300 bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100/80"
        >
          Открыть историю
        </Link>
        <Link
          href={variant === "clinic" ? "/clients" : "/clients?view=doctor"}
          className="inline-flex items-center rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
        >
          К списку
        </Link>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
