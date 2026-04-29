"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const btnBase =
  "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm";

type Props = { mode: "clinic" | "doctor" };

export function ClientsAddNewPanel({ mode }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [linkedDoctorName, setLinkedDoctorName] = useState("");

  const [doctorFullName, setDoctorFullName] = useState("");
  const [newClinicName, setNewClinicName] = useState("");
  const [newClinicAddress, setNewClinicAddress] = useState("");

  const reset = () => {
    setClinicName("");
    setClinicAddress("");
    setLinkedDoctorName("");
    setDoctorFullName("");
    setNewClinicName("");
    setNewClinicAddress("");
    setError(null);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  async function onSubmitClinic(e: React.FormEvent) {
    e.preventDefault();
    const name = clinicName.trim();
    if (!name) {
      setError("Укажите название клиники.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address: clinicAddress.trim() || null,
          doctorFullName: linkedDoctorName.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        clinic?: { id: string } | null;
        doctor?: { id: string };
      };
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Не удалось создать",
        );
        return;
      }
      const cid = data.clinic?.id;
      if (cid) {
        router.push(`/clients/${cid}`);
        router.refresh();
        return;
      }
      if (data.doctor?.id) {
        router.push(`/clients/doctors/${data.doctor.id}`);
        router.refresh();
      }
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitDoctor(e: React.FormEvent) {
    e.preventDefault();
    const dname = doctorFullName.trim();
    if (!dname) {
      setError("Укажите ФИО врача.");
      return;
    }
    const cname = newClinicName.trim();
    setSaving(true);
    setError(null);
    try {
      const body =
        cname.length > 0
          ? {
              name: cname,
              address: newClinicAddress.trim() || null,
              doctorFullName: dname,
            }
          : { doctorFullName: dname };

      const res = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        clinic?: { id: string } | null;
        doctor?: { id: string };
      };
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Не удалось создать",
        );
        return;
      }
      if (data.clinic?.id) {
        router.push(`/clients/${data.clinic.id}`);
        router.refresh();
        return;
      }
      if (data.doctor?.id) {
        router.push(`/clients/doctors/${data.doctor.id}`);
        router.refresh();
      }
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setSaving(false);
    }
  }

  const label =
    mode === "clinic" ? "Добавить клинику" : "Добавить врача";

  return (
    <div className="w-full sm:w-auto">
      {!open ? (
        <button
          type="button"
          className={`${btnBase} w-full border border-emerald-700/30 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 sm:w-auto`}
          onClick={() => {
            setOpen(true);
            setError(null);
          }}
        >
          {label}
        </button>
      ) : (
        <div className="w-full min-w-[min(100%,280px)] rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm sm:min-w-[320px]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--app-text)]">{label}</h3>
            <button
              type="button"
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-strong)]"
              onClick={close}
            >
              Закрыть
            </button>
          </div>
          {mode === "clinic" ? (
            <form className="space-y-3" onSubmit={(e) => void onSubmitClinic(e)}>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Название клиники <span className="text-red-600">*</span>
                </label>
                <input
                  required
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Например, Клиника на Невском"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Адрес
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  placeholder="Необязательно"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Врач (ФИО), если сразу завести
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                  value={linkedDoctorName}
                  onChange={(e) => setLinkedDoctorName(e.target.value)}
                  placeholder="Необязательно"
                />
              </div>
              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className={`${btnBase} bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50`}
                >
                  {saving ? "Создание…" : "Создать"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  className={`${btnBase} border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-body)] hover:bg-[var(--table-row-hover)] disabled:opacity-50`}
                  onClick={close}
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={(e) => void onSubmitDoctor(e)}>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  ФИО врача <span className="text-red-600">*</span>
                </label>
                <input
                  required
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                  value={doctorFullName}
                  onChange={(e) => setDoctorFullName(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Без клиники врач создаётся с пометкой частной практики (наряды
                без клиники). Если указать новую клинику ниже — врач сразу
                привяжется к ней.
              </p>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Новая клиника (название)
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                  value={newClinicName}
                  onChange={(e) => setNewClinicName(e.target.value)}
                  placeholder="Оставьте пустым, если только врач"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Адрес клиники
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                  value={newClinicAddress}
                  onChange={(e) => setNewClinicAddress(e.target.value)}
                  placeholder="Если создаёте клинику"
                />
              </div>
              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className={`${btnBase} bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50`}
                >
                  {saving ? "Создание…" : "Создать"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  className={`${btnBase} border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-body)] hover:bg-[var(--table-row-hover)] disabled:opacity-50`}
                  onClick={close}
                >
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
