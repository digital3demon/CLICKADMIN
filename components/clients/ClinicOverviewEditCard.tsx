"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CLINIC_DOCTOR_LINK_DELTA } from "@/lib/client-link-sync-events";

const btnBase =
  "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm";

type Props = {
  clinicId: string;
  initialName: string;
  initialAddress: string;
  initialNotes: string;
  initialIsActive: boolean;
  createdAt: Date;
  doctorCount: number;
  orderCount: number;
};

export function ClinicOverviewEditCard({
  clinicId,
  initialName,
  initialAddress,
  initialNotes,
  initialIsActive,
  createdAt,
  doctorCount,
  orderCount,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialName);
  const [address, setAddress] = useState(initialAddress);
  const [notes, setNotes] = useState(initialNotes);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [liveDoctorCount, setLiveDoctorCount] = useState(doctorCount);

  useEffect(() => {
    setLiveDoctorCount(doctorCount);
  }, [doctorCount]);

  useEffect(() => {
    const onDelta = (e: Event) => {
      const d = (e as CustomEvent<{ clinicId: string; delta: number }>).detail;
      if (d?.clinicId !== clinicId) return;
      setLiveDoctorCount((c) => Math.max(0, c + (d.delta ?? 0)));
    };
    window.addEventListener(CLINIC_DOCTOR_LINK_DELTA, onDelta);
    return () => window.removeEventListener(CLINIC_DOCTOR_LINK_DELTA, onDelta);
  }, [clinicId]);

  useEffect(() => {
    if (!editing) {
      setName(initialName);
      setAddress(initialAddress);
      setNotes(initialNotes);
      setIsActive(initialIsActive);
    }
  }, [editing, initialName, initialAddress, initialNotes, initialIsActive]);

  const onSave = useCallback(async () => {
    const n = name.trim();
    if (!n) {
      setError("Укажите название клиники");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          address: address.trim() || null,
          notes: notes.trim() || null,
          isActive,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Ошибка сохранения");
        setSaving(false);
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setSaving(false);
    }
  }, [clinicId, name, address, notes, isActive, router]);

  const onDelete = useCallback(async () => {
    const label = name.trim().split("\n")[0] || "клинику";
    const ok = window.confirm(
      `Удалить клинику «${label}»?\n\nЗапись скроется из списков. Восстановить можно в разделе «История и удалённые».`,
    );
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/clinics/${clinicId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Не удалось удалить");
        setDeleting(false);
        return;
      }
      router.push("/clients");
      router.refresh();
    } catch {
      setError("Сеть или сервер недоступны");
      setDeleting(false);
    }
  }, [clinicId, name, router]);

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm lg:col-span-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Клиника
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {!editing ? (
            <button
              type="button"
              className={`${btnBase} bg-[var(--sidebar-blue)] text-white hover:opacity-95`}
              onClick={() => {
                setEditing(true);
                setError(null);
              }}
            >
              Изменить
            </button>
          ) : (
            <>
              <Link
                href="/clients/history"
                className={`${btnBase} border border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-body)] hover:bg-[var(--card-bg)]`}
              >
                История
              </Link>
              <button
                type="button"
                disabled={saving || deleting}
                className={`${btnBase} border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-body)] hover:bg-[var(--table-row-hover)] disabled:opacity-50`}
                onClick={() => {
                  setEditing(false);
                  setName(initialName);
                  setAddress(initialAddress);
                  setNotes(initialNotes);
                  setIsActive(initialIsActive);
                  setError(null);
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={saving || deleting}
                className={`${btnBase} bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50`}
                onClick={() => void onSave()}
              >
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
              <button
                type="button"
                disabled={saving || deleting}
                className={`${btnBase} border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 disabled:opacity-50`}
                onClick={() => void onDelete()}
              >
                {deleting ? "Удаление…" : "Удалить"}
              </button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {editing ? (
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Название
            <textarea
              className="mt-1 w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
              rows={3}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Адрес
            <textarea
              className="mt-1 w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Заметки
            <textarea
              className="mt-1 w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-strong)]">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-[var(--input-border)] text-[var(--sidebar-blue)]"
            />
            Активна (ведём работу)
          </label>
        </div>
      ) : (
        <>
          <p className="mt-3 whitespace-pre-line text-base font-semibold text-[var(--app-text)]">
            {initialName}
          </p>
          {initialIsActive === false ? (
            <p className="mt-2 text-xs font-medium text-amber-800">
              Неактивна (в Excel или вручную). В нарядах всё ещё можно выбрать в
              списке.
            </p>
          ) : null}
        </>
      )}

      {!editing ? (
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-[var(--text-muted)]">Адрес</dt>
            <dd className="mt-0.5 whitespace-pre-line text-[var(--text-strong)]">
              {initialAddress?.trim() ? initialAddress : "—"}
            </dd>
          </div>
          {initialNotes?.trim() ? (
            <div>
              <dt className="text-[var(--text-muted)]">Заметки</dt>
              <dd className="mt-0.5 whitespace-pre-line text-sm text-[var(--text-body)]">
                {initialNotes}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-[var(--text-muted)]">В базе с</dt>
            <dd className="mt-0.5 text-[var(--text-strong)]">
              {createdAt.toLocaleString("ru-RU", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
          <div className="flex gap-6 pt-1">
            <div>
              <dt className="text-[var(--text-muted)]">Врачей</dt>
              <dd className="text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {liveDoctorCount}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Заказов</dt>
              <dd className="text-lg font-semibold tabular-nums text-[var(--app-text)]">
                {orderCount}
              </dd>
            </div>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
