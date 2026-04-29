"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildClinicRequisitesCopyText,
  CLINIC_REQUISITE_ROWS,
  type ClinicCopySource,
  type ClinicRequisiteKey,
} from "@/lib/clinic-requisites";

export type RequisitesFormState = ClinicCopySource;

const btnBase =
  "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm";

export function RequisitesPanel({
  clinicId,
  initial,
}: {
  clinicId: string;
  initial: RequisitesFormState;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<RequisitesFormState>(initial);
  const initialKey = useMemo(() => JSON.stringify(initial), [initial]);

  useEffect(() => {
    if (!editing) setValues(initial);
  }, [initialKey, editing, initial]);

  const copyText = useMemo(() => buildClinicRequisitesCopyText(values), [values]);

  const onCopy = useCallback(async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      setError("Не удалось скопировать — разрешите доступ к буферу обмена.");
    }
  }, [copyText]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, string | null> = {
        name: values.name.trim(),
        address: values.address?.trim() ? values.address.trim() : null,
      };
      for (const { key } of CLINIC_REQUISITE_ROWS) {
        const v = values[key];
        payload[key] = v != null && String(v).trim() ? String(v).trim() : null;
      }
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Ошибка сохранения",
        );
        setSaving(false);
        return;
      }
      setEditing(false);
      setValues({
        name: typeof data.name === "string" ? data.name : values.name,
        address:
          data.address != null && data.address !== ""
            ? String(data.address)
            : "",
        ...Object.fromEntries(
          CLINIC_REQUISITE_ROWS.map(({ key }) => {
            const raw = (data as Record<string, unknown>)[key];
            return [
              key,
              raw != null && raw !== "" ? String(raw) : "",
            ];
          }),
        ) as Record<ClinicRequisiteKey, string>,
      });
      router.refresh();
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof RequisitesFormState, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  return (
    <section
      className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm"
      role="tabpanel"
      aria-label="Реквизиты"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Реквизиты
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${btnBase} border border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-strong)] hover:bg-[var(--card-bg)]`}
            onClick={() => void onCopy()}
          >
            Скопировать
          </button>
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
              <button
                type="button"
                disabled={saving}
                className={`${btnBase} border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-body)] hover:bg-[var(--table-row-hover)] disabled:opacity-50`}
                onClick={() => {
                  setEditing(false);
                  setValues(initial);
                  setError(null);
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={saving}
                className={`${btnBase} bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50`}
                onClick={() => void onSave()}
              >
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
            </>
          )}
        </div>
      </div>

      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Юридические и банковские данные для договоров и счетов.
      </p>

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Краткое название (CRM)
          </dt>
          <dd className="mt-1">
            {editing ? (
              <input
                className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            ) : (
              <span className="whitespace-pre-wrap text-sm text-[var(--app-text)]">
                {values.name?.trim() ? values.name : "—"}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Адрес
          </dt>
          <dd className="mt-1">
            {editing ? (
              <textarea
                rows={2}
                className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.address ?? ""}
                onChange={(e) => setField("address", e.target.value)}
              />
            ) : (
              <span className="whitespace-pre-wrap text-sm text-[var(--app-text)]">
                {values.address?.trim() ? values.address : "—"}
              </span>
            )}
          </dd>
        </div>
        {CLINIC_REQUISITE_ROWS.map(({ key, label }) => (
          <div
            key={key}
            className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:border-0 sm:pb-0"
          >
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {label}
            </dt>
            <dd className="mt-1">
              {editing ? (
                <input
                  className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                  value={(values[key] as string) ?? ""}
                  onChange={(e) => setField(key, e.target.value)}
                />
              ) : (
                <span className="whitespace-pre-wrap break-words text-sm text-[var(--app-text)]">
                  {values[key] != null && String(values[key]).trim()
                    ? String(values[key])
                    : "—"}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
