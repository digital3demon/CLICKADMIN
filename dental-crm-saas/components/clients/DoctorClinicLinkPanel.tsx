"use client";

import { PrefixSearchCombobox } from "@/components/ui/PrefixSearchCombobox";
import {
  clinicComboboxSearchPrefixes,
  clinicSelectLabel,
} from "@/lib/clients-order-ui";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useMemo, useState } from "react";

const comboboxClass =
  "mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-text";

type ClinicRow = {
  id: string;
  name: string;
  address: string | null;
  isActive?: boolean;
  legalFullName?: string | null;
  billingLegalForm?: "IP" | "OOO" | null;
};

type Props = {
  doctorId: string;
  linkedClinicIds: string[];
  /** Если задан — список обновляется локально, без router.refresh (надёжнее в App Router). */
  onClinicLinked?: (clinic: {
    id: string;
    name: string;
    address: string | null;
  }) => void;
};

export function DoctorClinicLinkPanel({
  doctorId,
  linkedClinicIds,
  onClinicLinked,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [clinics, setClinics] = useState<ClinicRow[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const linkedSet = new Set(linkedClinicIds);

  const openModal = useCallback(async () => {
    setOpen(true);
    setErr(null);
    setLoadErr(null);
    setClinicId("");
    setName("");
    setAddress("");
    setMode("existing");
    if (clinics != null) return;
    try {
      const res = await fetch("/api/clinics");
      const data = (await res.json()) as {
        error?: string;
        clinics?: ClinicRow[];
      };
      if (!res.ok) {
        setLoadErr(data.error ?? "Не удалось загрузить клиники");
        return;
      }
      setClinics(data.clinics ?? []);
    } catch {
      setLoadErr("Сеть или сервер недоступны");
    }
  }, [clinics]);

  const available = (clinics ?? []).filter((c) => !linkedSet.has(c.id));

  const clinicComboboxOptions = useMemo(
    () =>
      available.map((c) => ({
        value: c.id,
        label: clinicSelectLabel(c),
        searchPrefixes: clinicComboboxSearchPrefixes(c),
      })),
    [available],
  );

  const submit = useCallback(async () => {
    setErr(null);
    setSaving(true);
    try {
      const body =
        mode === "new"
          ? {
              name: name.trim(),
              address: address.trim() || undefined,
            }
          : { clinicId: clinicId.trim() };
      if (mode === "new" && !name.trim()) {
        setErr("Введите название клиники");
        setSaving(false);
        return;
      }
      if (mode === "existing" && !clinicId.trim()) {
        setErr("Выберите клинику");
        setSaving(false);
        return;
      }
      const res = await fetch(
        `/api/doctors/${encodeURIComponent(doctorId)}/clinic-links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        clinic?: { id: string; name: string; address: string | null };
      };
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Ошибка");
        setSaving(false);
        return;
      }
      setOpen(false);
      if (data.clinic && onClinicLinked) {
        onClinicLinked(data.clinic);
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
  }, [doctorId, mode, name, address, clinicId, router, onClinicLinked]);

  return (
    <>
      <button
        type="button"
        onClick={() => void openModal()}
        className="shrink-0 rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 sm:text-sm"
      >
        Добавить клинику
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
            aria-labelledby="doctor-add-clinic-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="doctor-add-clinic-title"
              className="text-base font-semibold text-[var(--app-text)]"
            >
              Клиника у этого врача
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Привяжите существующую клинику из базы или создайте новую
              карточку клиники и сразу свяжите её с врачом.
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
                Новая клиника
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
                  Клиника
                  {!clinics ? (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Загрузка списка…
                    </p>
                  ) : available.length === 0 ? (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {(clinics ?? []).length === 0
                        ? "В базе пока нет ни одной клиники."
                        : "Все клиники из базы уже связаны с этим врачом. Выберите «Новая клиника» или отвяжите лишнюю в списке."}
                    </p>
                  ) : (
                    <PrefixSearchCombobox
                      className={comboboxClass}
                      options={clinicComboboxOptions}
                      value={clinicId}
                      onChange={setClinicId}
                      disabled={false}
                      placeholder="Начните вводить название клиники…"
                      emptyOptionLabel="Выбрать"
                    />
                  )}
                </label>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-medium text-[var(--text-body)]">
                  Название клиники
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-muted)] px-2 py-2 text-sm text-[var(--app-text)]"
                    placeholder="Стоматология …"
                  />
                </label>
                <label className="block text-xs font-medium text-[var(--text-body)]">
                  Адрес (необязательно)
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-muted)] px-2 py-2 text-sm text-[var(--app-text)]"
                    placeholder="Город, улица…"
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
