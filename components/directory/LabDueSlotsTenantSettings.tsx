"use client";

import { useCallback, useEffect, useState } from "react";
import { normalizeLabDueHmSlots } from "@/lib/lab-due-hm-slots";

const inp =
  "rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]";

export function LabDueSlotsTenantSettings({
  canEdit,
}: {
  canEdit: boolean;
}) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/lab-due-hm-slots");
      const j = (await res.json()) as { slots?: string[]; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Ошибка загрузки");
      setSlots(normalizeLabDueHmSlots(j.slots ?? null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setSlots(normalizeLabDueHmSlots(null));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!canEdit) return;
    const normalized = normalizeLabDueHmSlots(slots);
    if (normalized.length < 1) {
      setError("Нужен хотя бы один слот времени");
      return;
    }
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/tenant/lab-due-hm-slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: normalized }),
      });
      const j = (await res.json()) as { slots?: string[]; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Не сохранено");
      setSlots(normalizeLabDueHmSlots(j.slots ?? normalized));
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
      <h2 className="m-0 text-base font-semibold text-[var(--app-text)]">
        Срок лабораторный в нарядах
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Время сдачи для поля «Срок лабораторный» и «Срок лаборатории» при создании наряда:
        только выбранные часы (плюс режим «В теч. дня» в форме). Хранится в базе организации.
      </p>
      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Загрузка…</p>
      ) : (
        <div className="mt-4 space-y-3">
          <ul className="list-none space-y-2 p-0">
            {slots.map((hm, idx) => (
              <li key={`${idx}-${hm}`} className="flex flex-wrap items-center gap-2">
                <input
                  type="time"
                  step={60}
                  className={inp}
                  disabled={!canEdit || saving}
                  value={hm}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSlots((prev) =>
                      prev.map((x, i) => (i === idx ? v : x)),
                    );
                  }}
                />
                {canEdit ? (
                  <button
                    type="button"
                    className="text-xs text-red-600 underline hover:no-underline disabled:opacity-50"
                    disabled={saving || slots.length < 2}
                    onClick={() =>
                      setSlots((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    Удалить
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)] disabled:opacity-50"
                disabled={saving || slots.length >= 24}
                onClick={() => setSlots((prev) => [...prev, "12:00"])}
              >
                Добавить время
              </button>
              <button
                type="button"
                className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              Изменение — только у владельца, старшего или обычного администратора.
            </p>
          )}
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {ok ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Сохранено. Новые значения подставятся в формах нарядов после обновления страницы.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
