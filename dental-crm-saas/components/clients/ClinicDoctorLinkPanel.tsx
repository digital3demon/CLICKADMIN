"use client";

import { PrefixSearchCombobox } from "@/components/ui/PrefixSearchCombobox";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useMemo, useState } from "react";

const comboboxClass =
  "mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-text";

type DoctorRow = { id: string; fullName: string };

type Props = {
  clinicId: string;
  /** id врачей, уже связанных с этой клиникой (в т.ч. скрытых в списке из‑за deleted) */
  linkedDoctorIds: string[];
  onDoctorLinked?: (doctor: { id: string; fullName: string }) => void;
};

export function ClinicDoctorLinkPanel({
  clinicId,
  linkedDoctorIds,
  onDoctorLinked,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [doctors, setDoctors] = useState<DoctorRow[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const linkedSet = new Set(linkedDoctorIds);

  const openModal = useCallback(async () => {
    setOpen(true);
    setErr(null);
    setLoadErr(null);
    setDoctorId("");
    setFullName("");
    setMode("existing");
    if (doctors != null) return;
    try {
      const res = await fetch("/api/clinics");
      const data = (await res.json()) as {
        error?: string;
        allDoctors?: DoctorRow[];
      };
      if (!res.ok) {
        setLoadErr(data.error ?? "Не удалось загрузить врачей");
        return;
      }
      setDoctors(data.allDoctors ?? []);
    } catch {
      setLoadErr("Сеть или сервер недоступны");
    }
  }, [doctors]);

  const available = (doctors ?? []).filter((d) => !linkedSet.has(d.id));

  const doctorComboboxOptions = useMemo(
    () => available.map((d) => ({ value: d.id, label: d.fullName })),
    [available],
  );

  const submit = useCallback(async () => {
    setErr(null);
    setSaving(true);
    try {
      const body =
        mode === "new"
          ? { fullName: fullName.trim() }
          : { doctorId: doctorId.trim() };
      if (mode === "new" && !fullName.trim()) {
        setErr("Введите ФИО врача");
        setSaving(false);
        return;
      }
      if (mode === "existing" && !doctorId.trim()) {
        setErr("Выберите врача");
        setSaving(false);
        return;
      }
      const res = await fetch(
        `/api/clinics/${encodeURIComponent(clinicId)}/doctor-links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        doctor?: { id: string; fullName: string };
      };
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Ошибка");
        setSaving(false);
        return;
      }
      setOpen(false);
      if (data.doctor && onDoctorLinked) {
        onDoctorLinked(data.doctor);
      } else {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setErr("Сеть или сервер недоступны");
    } finally {
      setSaving(false);
    }
  }, [clinicId, mode, fullName, doctorId, router, onDoctorLinked]);

  return (
    <>
      <button
        type="button"
        onClick={() => void openModal()}
        className="shrink-0 rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 sm:text-sm"
      >
        Добавить врача
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => {
            if (!saving) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clinic-add-doctor-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="clinic-add-doctor-title"
              className="text-base font-semibold text-[var(--app-text)]"
            >
              Врач у этой клиники
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Свяжите существующего врача из базы или создайте новую карточку
              врача и сразу привяжите её к клинике.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setMode("existing")}
                className={
                  mode === "existing"
                    ? "rounded-full bg-[var(--sidebar-blue)] px-3 py-1 text-xs font-semibold text-white"
                    : "rounded-full border border-[var(--card-border)] px-3 py-1 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                }
              >
                Из базы
              </button>
              <button
                type="button"
                onClick={() => setMode("new")}
                className={
                  mode === "new"
                    ? "rounded-full bg-[var(--sidebar-blue)] px-3 py-1 text-xs font-semibold text-white"
                    : "rounded-full border border-[var(--card-border)] px-3 py-1 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                }
              >
                Новый врач
              </button>
            </div>

            {loadErr ? (
              <p className="mt-3 text-sm text-red-700 dark:text-red-300">
                {loadErr}
              </p>
            ) : null}

            {mode === "existing" ? (
              <div className="mt-4 space-y-2">
                <label className="block text-xs font-medium text-[var(--text-body)]">
                  Врач
                  {!doctors ? (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Загрузка списка…
                    </p>
                  ) : available.length === 0 ? (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {doctors.length === 0
                        ? "В базе пока нет ни одного врача."
                        : "Все врачи из базы уже связаны с этой клиникой. Выберите «Новый врач» или отвяжите лишнего в списке."}
                    </p>
                  ) : (
                    <PrefixSearchCombobox
                      className={comboboxClass}
                      options={doctorComboboxOptions}
                      value={doctorId}
                      onChange={setDoctorId}
                      disabled={false}
                      placeholder="Начните вводить ФИО врача…"
                      emptyOptionLabel="Выбрать"
                    />
                  )}
                </label>
              </div>
            ) : (
              <div className="mt-4">
                <label className="block text-xs font-medium text-[var(--text-body)]">
                  ФИО нового врача
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-muted)] px-2 py-2 text-sm text-[var(--app-text)]"
                    placeholder="Иванов Иван Иванович"
                    autoComplete="name"
                  />
                </label>
              </div>
            )}

            {err ? (
              <p className="mt-3 text-sm text-red-700 dark:text-red-300">
                {err}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setOpen(false)}
                className="rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={
                  saving ||
                  (mode === "existing" &&
                    (!!loadErr || available.length === 0))
                }
                onClick={() => void submit()}
                className="rounded-md bg-[var(--sidebar-blue)] px-3 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
              >
                {saving ? "Сохранение…" : "Привязать"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
