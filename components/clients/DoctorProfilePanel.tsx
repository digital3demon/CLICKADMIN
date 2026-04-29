"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { displayOrDash, formatBirthdayRu } from "@/lib/format-display";

/** Пустая строка = в БД null. */
export type DoctorOrderPriceListKindUi = "" | "MAIN" | "CUSTOM";

export type DoctorProfileFormState = {
  fullName: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  formerLastName: string;
  specialty: string;
  city: string;
  email: string;
  clinicWorkEmail: string;
  phone: string;
  preferredContact: string;
  telegramUsername: string;
  birthday: string;
  particulars: string;
  acceptsPrivatePractice: boolean;
  isIpEntrepreneur: boolean;
  orderPriceListKind: DoctorOrderPriceListKindUi;
};

function buildDoctorCopyText(v: DoctorProfileFormState): string {
  const lines: string[] = [v.fullName.trim() || "—"];
  if (v.lastName.trim()) lines.push(`Фамилия: ${v.lastName.trim()}`);
  if (v.firstName.trim()) lines.push(`Имя: ${v.firstName.trim()}`);
  if (v.patronymic.trim()) lines.push(`Отчество: ${v.patronymic.trim()}`);
  if (v.formerLastName.trim()) {
    lines.push(`Фамилия ранее: ${v.formerLastName.trim()}`);
  }
  if (v.specialty.trim()) lines.push(`Специальность: ${v.specialty.trim()}`);
  if (v.city.trim()) lines.push(`Город: ${v.city.trim()}`);
  if (v.email.trim()) lines.push(`E-mail: ${v.email.trim()}`);
  if (v.clinicWorkEmail.trim()) {
    lines.push(`Почта клиники (наряды): ${v.clinicWorkEmail.trim()}`);
  }
  lines.push(`Телефон: ${v.phone.trim() || "—"}`);
  lines.push(`Связь: ${v.preferredContact.trim() || "—"}`);
  const tg = v.telegramUsername.trim().replace(/^@+/, "");
  lines.push(`Telegram: ${tg ? `@${tg}` : "—"}`);
  lines.push(`День рождения: ${v.birthday.trim() || "—"}`);
  if (v.particulars.trim()) lines.push("", v.particulars.trim());
  lines.push(
    "",
    v.orderPriceListKind === "MAIN"
      ? "Прайс в нарядах: основной каталог"
      : v.orderPriceListKind === "CUSTOM"
        ? "Прайс в нарядах: индивидуальный"
        : "Прайс в нарядах: не задан (берётся из клиники или не задан)",
  );
  lines.push(
    "",
    v.acceptsPrivatePractice
      ? "Частная практика: да (наряды без клиники)"
      : "Частная практика: нет",
  );
  lines.push(
    "",
    v.isIpEntrepreneur
      ? "Доктор — ИП: да (клиника в справочнике для реквизитов и сверок)"
      : "Доктор — ИП: нет",
  );
  return lines.join("\n");
}

const btnBase =
  "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm";

export function DoctorProfilePanel({
  doctorId,
  initial,
}: {
  doctorId: string;
  initial: DoctorProfileFormState;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<DoctorProfileFormState>(initial);
  const initialKey = useMemo(() => JSON.stringify(initial), [initial]);

  useEffect(() => {
    if (!editing) setValues(initial);
  }, [initialKey, editing, initial]);

  const copyText = useMemo(() => buildDoctorCopyText(values), [values]);

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
      const res = await fetch(`/api/doctors/${doctorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName.trim(),
          lastName: values.lastName.trim() || null,
          firstName: values.firstName.trim() || null,
          patronymic: values.patronymic.trim() || null,
          formerLastName: values.formerLastName.trim() || null,
          specialty: values.specialty.trim() || null,
          city: values.city.trim() || null,
          email: values.email.trim() || null,
          clinicWorkEmail: values.clinicWorkEmail.trim() || null,
          phone: values.phone.trim() || null,
          preferredContact: values.preferredContact.trim() || null,
          telegramUsername: values.telegramUsername.trim() || null,
          birthday: values.birthday.trim() || null,
          particulars: values.particulars.trim() || null,
          acceptsPrivatePractice: values.acceptsPrivatePractice,
          isIpEntrepreneur: values.isIpEntrepreneur,
          orderPriceListKind:
            values.orderPriceListKind === ""
              ? null
              : values.orderPriceListKind,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Ошибка сохранения",
        );
        setSaving(false);
        return;
      }
      const birthdayStr =
        data.birthday != null && typeof data.birthday === "string"
          ? String(data.birthday).slice(0, 10)
          : "";
      setValues({
        fullName: typeof data.fullName === "string" ? data.fullName : values.fullName,
        lastName: data.lastName != null ? String(data.lastName) : "",
        firstName: data.firstName != null ? String(data.firstName) : "",
        patronymic: data.patronymic != null ? String(data.patronymic) : "",
        formerLastName:
          data.formerLastName != null ? String(data.formerLastName) : "",
        specialty: data.specialty != null ? String(data.specialty) : "",
        city: data.city != null ? String(data.city) : "",
        email: data.email != null ? String(data.email) : "",
        clinicWorkEmail:
          data.clinicWorkEmail != null ? String(data.clinicWorkEmail) : "",
        phone: data.phone != null ? String(data.phone) : "",
        preferredContact:
          data.preferredContact != null ? String(data.preferredContact) : "",
        telegramUsername:
          data.telegramUsername != null ? String(data.telegramUsername) : "",
        birthday: birthdayStr,
        particulars: data.particulars != null ? String(data.particulars) : "",
        acceptsPrivatePractice: Boolean(data.acceptsPrivatePractice),
        isIpEntrepreneur: Boolean(data.isIpEntrepreneur),
        orderPriceListKind:
          data.orderPriceListKind === "MAIN" ||
          data.orderPriceListKind === "CUSTOM"
            ? data.orderPriceListKind
            : "",
      });
      setEditing(false);
      router.refresh();
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = useCallback(async () => {
    const label = values.fullName.trim() || "врача";
    const ok = window.confirm(
      `Удалить врача «${label}» из конфигурации?\n\nЗапись скроется из списков. Восстановить можно в разделе «История и удалённые».`,
    );
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/doctors/${doctorId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Не удалось удалить",
        );
        setDeleting(false);
        return;
      }
      router.push("/clients?view=doctor");
      router.refresh();
    } catch {
      setError("Сеть или сервер недоступны");
      setDeleting(false);
    }
  }, [doctorId, values.fullName, router]);

  const displayBirthday =
    values.birthday.trim() && /^\d{4}-\d{2}-\d{2}$/.test(values.birthday.trim())
      ? formatBirthdayRu(new Date(`${values.birthday.trim()}T12:00:00.000Z`))
      : "—";

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
                  setValues(initial);
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

      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        ФИО, контакты и настройки врача в CRM (аналог карточки клиники).
      </p>

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:col-span-2 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            ФИО (отображение)
          </dt>
          <dd className="mt-1">
            {editing ? (
              <input
                className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.fullName}
                onChange={(e) =>
                  setValues((p) => ({ ...p, fullName: e.target.value }))
                }
              />
            ) : (
              <span className="whitespace-pre-wrap text-sm text-[var(--app-text)]">
                {values.fullName.trim() ? values.fullName : "—"}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Фамилия
          </dt>
          <dd className="mt-1">
            {editing ? (
              <input
                className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.lastName}
                onChange={(e) =>
                  setValues((p) => ({ ...p, lastName: e.target.value }))
                }
              />
            ) : (
              <span className="text-sm text-[var(--app-text)]">
                {displayOrDash(values.lastName)}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Имя
          </dt>
          <dd className="mt-1">
            {editing ? (
              <input
                className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.firstName}
                onChange={(e) =>
                  setValues((p) => ({ ...p, firstName: e.target.value }))
                }
              />
            ) : (
              <span className="text-sm text-[var(--app-text)]">
                {displayOrDash(values.firstName)}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Отчество
          </dt>
          <dd className="mt-1">
            {editing ? (
              <input
                className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.patronymic}
                onChange={(e) =>
                  setValues((p) => ({ ...p, patronymic: e.target.value }))
                }
              />
            ) : (
              <span className="text-sm text-[var(--app-text)]">
                {displayOrDash(values.patronymic)}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Фамилия ранее
          </dt>
          <dd className="mt-1">
            {editing ? (
              <input
                className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.formerLastName}
                onChange={(e) =>
                  setValues((p) => ({ ...p, formerLastName: e.target.value }))
                }
              />
            ) : (
              <span className="text-sm text-[var(--app-text)]">
                {displayOrDash(values.formerLastName)}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Специальность
          </dt>
          <dd className="mt-1">
            {editing ? (
              <input
                className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.specialty}
                onChange={(e) =>
                  setValues((p) => ({ ...p, specialty: e.target.value }))
                }
              />
            ) : (
              <span className="text-sm text-[var(--app-text)]">
                {displayOrDash(values.specialty)}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Город
          </dt>
          <dd className="mt-1">
            {editing ? (
              <input
                className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.city}
                onChange={(e) =>
                  setValues((p) => ({ ...p, city: e.target.value }))
                }
              />
            ) : (
              <span className="text-sm text-[var(--app-text)]">
                {displayOrDash(values.city)}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            E-mail
          </dt>
          <dd className="mt-1">
            {editing ? (
              <input
                type="email"
                className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.email}
                onChange={(e) =>
                  setValues((p) => ({ ...p, email: e.target.value }))
                }
              />
            ) : (
              <span className="text-sm text-[var(--app-text)]">
                {displayOrDash(values.email)}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:col-span-2 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Почта клиники (с которой присылают работы)
          </dt>
          <dd className="mt-1">
            {editing ? (
              <input
                type="email"
                className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.clinicWorkEmail}
                onChange={(e) =>
                  setValues((p) => ({ ...p, clinicWorkEmail: e.target.value }))
                }
              />
            ) : (
              <span className="text-sm text-[var(--app-text)]">
                {displayOrDash(values.clinicWorkEmail)}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Телефон
          </dt>
          <dd className="mt-1">
            {editing ? (
              <input
                className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.phone}
                onChange={(e) =>
                  setValues((p) => ({ ...p, phone: e.target.value }))
                }
              />
            ) : (
              <span className="text-sm text-[var(--app-text)]">
                {displayOrDash(values.phone)}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Предпочтительная связь
          </dt>
          <dd className="mt-1">
            {editing ? (
              <input
                className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.preferredContact}
                onChange={(e) =>
                  setValues((p) => ({ ...p, preferredContact: e.target.value }))
                }
              />
            ) : (
              <span className="text-sm text-[var(--app-text)]">
                {displayOrDash(values.preferredContact)}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Telegram (ник без @)
          </dt>
          <dd className="mt-1">
            {editing ? (
              <input
                className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.telegramUsername}
                onChange={(e) =>
                  setValues((p) => ({ ...p, telegramUsername: e.target.value }))
                }
              />
            ) : (
              <span className="text-sm text-[var(--app-text)]">
                {values.telegramUsername.trim()
                  ? `@${values.telegramUsername.replace(/^@+/, "")}`
                  : "—"}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            День рождения
          </dt>
          <dd className="mt-1">
            {editing ? (
              <input
                type="date"
                className="rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.birthday}
                onChange={(e) =>
                  setValues((p) => ({ ...p, birthday: e.target.value }))
                }
              />
            ) : (
              <span className="text-sm text-[var(--app-text)]">{displayBirthday}</span>
            )}
          </dd>
        </div>
        <div className="min-w-0 border-b border-[var(--border-subtle)] pb-4 sm:col-span-2 sm:border-0 sm:pb-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Особенности
          </dt>
          <dd className="mt-1">
            {editing ? (
              <textarea
                rows={4}
                className="w-full rounded-md border border-[var(--input-border)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
                value={values.particulars}
                onChange={(e) =>
                  setValues((p) => ({ ...p, particulars: e.target.value }))
                }
              />
            ) : (
              <span className="whitespace-pre-wrap text-sm text-[var(--app-text)]">
                {displayOrDash(values.particulars)}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Прайс в нарядах
          </dt>
          <dd className="mt-1">
            {editing ? (
              <div className="space-y-1">
                <select
                  className="w-full max-w-md rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  value={values.orderPriceListKind}
                  onChange={(e) =>
                    setValues((p) => ({
                      ...p,
                      orderPriceListKind: e.target
                        .value as DoctorOrderPriceListKindUi,
                    }))
                  }
                >
                  <option value="">Не задан (как в клинике или не задано)</option>
                  <option value="MAIN">Основной каталог</option>
                  <option value="CUSTOM">Индивидуальный</option>
                </select>
                <p className="text-xs text-[var(--text-muted)]">
                  Если задано здесь — перекрывает настройку клиники в наряде. Для
                  частной практики — единственный источник.
                </p>
              </div>
            ) : (
              <span className="text-sm text-[var(--app-text)]">
                {values.orderPriceListKind === "MAIN"
                  ? "Основной каталог"
                  : values.orderPriceListKind === "CUSTOM"
                    ? "Индивидуальный"
                    : "— (как в клинике или не задано)"}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Частная практика
          </dt>
          <dd className="mt-2">
            {editing ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-strong)]">
                <input
                  type="checkbox"
                  checked={values.acceptsPrivatePractice}
                  onChange={(e) =>
                    setValues((p) => ({
                      ...p,
                      acceptsPrivatePractice: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-[var(--input-border)]"
                />
                Можно оформлять наряд без клиники
              </label>
            ) : (
              <span className="text-sm text-[var(--app-text)]">
                {values.acceptsPrivatePractice
                  ? "Да — можно оформлять наряд без клиники"
                  : "—"}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Доктор — ИП
          </dt>
          <dd className="mt-2">
            {editing ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-strong)]">
                <input
                  type="checkbox"
                  checked={values.isIpEntrepreneur}
                  onChange={(e) =>
                    setValues((p) => ({
                      ...p,
                      isIpEntrepreneur: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-[var(--input-border)]"
                />
                Ведёт деятельность как ИП (в клиниках — запись с реквизитами и
                сверками; в наряде можно выбрать «ИП» или «частное лицо»)
              </label>
            ) : (
              <span className="text-sm text-[var(--app-text)]">
                {values.isIpEntrepreneur
                  ? "Да — в справочнике клиник есть запись ИП"
                  : "—"}
              </span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
