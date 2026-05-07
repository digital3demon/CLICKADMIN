"use client";

import { useEffect, useState } from "react";
import {
  clampOrderArchiveRetentionDays,
  DEFAULT_ORDER_ARCHIVE_RETENTION_DAYS,
} from "@/lib/order-archive-retention";

export function OrderArchiveRetentionTenantSettings({ canEdit }: { canEdit: boolean }) {
  const [days, setDays] = useState(DEFAULT_ORDER_ARCHIVE_RETENTION_DAYS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/tenant/order-archive-retention", {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((j: { retentionDays?: unknown }) => {
        if (cancelled) return;
        const raw = typeof j.retentionDays === "number" ? j.retentionDays : undefined;
        setDays(clampOrderArchiveRetentionDays(raw));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    const nextDays = clampOrderArchiveRetentionDays(days);
    setDays(nextDays);
    try {
      const res = await fetch("/api/tenant/order-archive-retention", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionDays: nextDays }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        retentionDays?: number;
      };
      if (!res.ok) {
        setMessage(j.error ?? "Не сохранено");
        return;
      }
      setDays(clampOrderArchiveRetentionDays(j.retentionDays));
      setMessage("Сохранено");
    } catch {
      setMessage("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
      <h2 className="m-0 text-base font-semibold text-[var(--app-text)]">
        Архив заказов
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Через сколько дней удалять архивные заказы и их файлы без возможности восстановления.
      </p>
      <label className="mt-4 block max-w-xs text-sm">
        <span className="mb-1 block text-[var(--text-secondary)]">
          Хранить в архиве (дней)
        </span>
        <input
          type="number"
          min={1}
          max={3650}
          step={1}
          value={days}
          disabled={!canEdit || saving}
          onChange={(e) => setDays(Number(e.target.value))}
          onBlur={() => void save()}
          className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)] disabled:opacity-60"
        />
      </label>
      {!canEdit ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Изменить срок могут владелец, старший администратор или администратор.
        </p>
      ) : null}
      {message ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">{message}</p>
      ) : null}
    </section>
  );
}
