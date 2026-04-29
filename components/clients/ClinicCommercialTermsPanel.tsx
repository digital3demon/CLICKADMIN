"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const btnBase =
  "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm";

/** Пустая строка = в БД null (не указано). */
export type ClinicBillingLegalFormUi = "" | "IP" | "OOO";

/** Пустая строка = в БД null (периодичность не задана). */
export type ClinicReconciliationFrequencyUi =
  | ""
  | "MONTHLY_1"
  | "MONTHLY_2";

/** Пустая строка = в БД null (прайс по умолчанию для нарядов с этой клиникой). */
export type ClinicOrderPriceListKindUi = "" | "MAIN" | "CUSTOM";

export type ClinicCommercialInitial = {
  billingLegalForm: ClinicBillingLegalFormUi;
  orderPriceListKind: ClinicOrderPriceListKindUi;
  worksWithReconciliation: boolean;
  reconciliationFrequency: ClinicReconciliationFrequencyUi;
  contractSigned: boolean;
  /** Пустая строка в форме = null в БД */
  contractNumber: string;
  worksWithEdo: boolean;
};

function yesNo(v: boolean) {
  return v ? "Да" : "Нет";
}

function legalFormLabel(v: ClinicBillingLegalFormUi) {
  if (v === "IP") return "ИП";
  if (v === "OOO") return "ООО";
  return "—";
}

function reconciliationFrequencyReadLabel(v: ClinicReconciliationFrequencyUi) {
  if (v === "MONTHLY_1") return "1 раз в месяц";
  if (v === "MONTHLY_2") return "2 раза в месяц";
  return "—";
}

function orderPriceListKindReadLabel(v: ClinicOrderPriceListKindUi) {
  if (v === "MAIN") return "Основной каталог";
  if (v === "CUSTOM") return "Индивидуальный";
  return "—";
}

export function ClinicCommercialTermsPanel({
  clinicId,
  initial,
}: {
  clinicId: string;
  initial: ClinicCommercialInitial;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<ClinicCommercialInitial>(initial);
  const initialKey = useMemo(() => JSON.stringify(initial), [initial]);

  useEffect(() => {
    if (!editing) setValues(initial);
  }, [initialKey, editing, initial]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingLegalForm:
            values.billingLegalForm === "" ? null : values.billingLegalForm,
          worksWithReconciliation: values.worksWithReconciliation,
          reconciliationFrequency: !values.worksWithReconciliation
            ? null
            : values.reconciliationFrequency === "MONTHLY_1" ||
                values.reconciliationFrequency === "MONTHLY_2"
              ? values.reconciliationFrequency
              : null,
          contractSigned: values.contractSigned,
          contractNumber: values.contractNumber.trim() || null,
          worksWithEdo: values.worksWithEdo,
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
      setValues({
        billingLegalForm:
          data.billingLegalForm === "IP" || data.billingLegalForm === "OOO"
            ? data.billingLegalForm
            : "",
        orderPriceListKind:
          data.orderPriceListKind === "MAIN" ||
          data.orderPriceListKind === "CUSTOM"
            ? data.orderPriceListKind
            : "",
        worksWithReconciliation: Boolean(data.worksWithReconciliation),
        reconciliationFrequency:
          data.reconciliationFrequency === "MONTHLY_1" ||
          data.reconciliationFrequency === "MONTHLY_2"
            ? data.reconciliationFrequency
            : "",
        contractSigned: Boolean(data.contractSigned),
        contractNumber:
          typeof data.contractNumber === "string" ? data.contractNumber : "",
        worksWithEdo: Boolean(data.worksWithEdo),
      });
      setEditing(false);
      router.refresh();
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Договор и документооборот
        </h2>
        <div className="flex flex-wrap gap-2">
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
        Данные можно подтянуть из реестра Excel (колонки «Работаем от Юр.лица»,
        «Сверка», «Подписан», «ЭДО») и править здесь.
      </p>
      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <dl className="mt-5 space-y-4 text-sm">
        <div className="flex flex-col gap-2 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <dt className="font-medium text-[var(--text-body)]">
            От какого юрлица работает
          </dt>
          <dd className="min-w-0 sm:text-right">
            {editing ? (
              <div className="flex flex-wrap justify-end gap-4 text-[var(--text-strong)]">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="clinicBillingLegalForm"
                    checked={values.billingLegalForm === ""}
                    onChange={() =>
                      setValues((p) => ({ ...p, billingLegalForm: "" }))
                    }
                    className="h-4 w-4 border-[var(--input-border)]"
                  />
                  Не указано
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="clinicBillingLegalForm"
                    checked={values.billingLegalForm === "IP"}
                    onChange={() =>
                      setValues((p) => ({ ...p, billingLegalForm: "IP" }))
                    }
                    className="h-4 w-4 border-[var(--input-border)]"
                  />
                  ИП
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="clinicBillingLegalForm"
                    checked={values.billingLegalForm === "OOO"}
                    onChange={() =>
                      setValues((p) => ({ ...p, billingLegalForm: "OOO" }))
                    }
                    className="h-4 w-4 border-[var(--input-border)]"
                  />
                  ООО
                </label>
              </div>
            ) : (
              <span className="text-[var(--app-text)]">
                {legalFormLabel(values.billingLegalForm)}
              </span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-2 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <dt className="font-medium text-[var(--text-body)]">
            Прайс в нарядах
            <span className="mt-0.5 block text-xs font-normal normal-case text-[var(--text-muted)]">
              По умолчанию для нарядов с этой клиникой; в карточке врача можно
              задать своё значение.
            </span>
          </dt>
          <dd className="min-w-0 sm:max-w-md sm:text-right">
            {editing ? (
              <select
                className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:mt-0 sm:max-w-xs sm:ml-auto"
                value={values.orderPriceListKind}
                onChange={(e) =>
                  setValues((p) => ({
                    ...p,
                    orderPriceListKind: e.target.value as ClinicOrderPriceListKindUi,
                  }))
                }
              >
                <option value="">Не задано</option>
                <option value="MAIN">Основной каталог</option>
                <option value="CUSTOM">Индивидуальный</option>
              </select>
            ) : (
              <span className="text-[var(--app-text)]">
                {orderPriceListKindReadLabel(values.orderPriceListKind)}
              </span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-2 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <dt className="font-medium text-[var(--text-body)]">Работают по сверке</dt>
          <dd>
            {editing ? (
              <label className="flex cursor-pointer items-center gap-2 text-[var(--text-strong)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--input-border)]"
                  checked={values.worksWithReconciliation}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setValues((p) => ({
                      ...p,
                      worksWithReconciliation: on,
                      reconciliationFrequency: on ? p.reconciliationFrequency : "",
                    }));
                  }}
                />
                Да
              </label>
            ) : (
              <span className="text-[var(--app-text)]">{yesNo(values.worksWithReconciliation)}</span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-2 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <dt className="font-medium text-[var(--text-body)]">
            Периодичность сверки
          </dt>
          <dd className="min-w-0 sm:text-right">
            {!values.worksWithReconciliation ? (
              <span className="text-[var(--text-muted)]">—</span>
            ) : editing ? (
              <div className="flex flex-col items-stretch gap-2 text-[var(--text-strong)] sm:items-end">
                <label className="flex cursor-pointer items-center gap-2 sm:justify-end">
                  <input
                    type="radio"
                    name="clinicReconciliationFrequency"
                    checked={values.reconciliationFrequency === ""}
                    onChange={() =>
                      setValues((p) => ({ ...p, reconciliationFrequency: "" }))
                    }
                    className="h-4 w-4 border-[var(--input-border)]"
                  />
                  Не указано
                </label>
                <label className="flex cursor-pointer items-center gap-2 sm:justify-end">
                  <input
                    type="radio"
                    name="clinicReconciliationFrequency"
                    checked={values.reconciliationFrequency === "MONTHLY_1"}
                    onChange={() =>
                      setValues((p) => ({
                        ...p,
                        reconciliationFrequency: "MONTHLY_1",
                      }))
                    }
                    className="h-4 w-4 border-[var(--input-border)]"
                  />
                  1 раз в месяц
                </label>
                <label className="flex cursor-pointer items-center gap-2 sm:justify-end">
                  <input
                    type="radio"
                    name="clinicReconciliationFrequency"
                    checked={values.reconciliationFrequency === "MONTHLY_2"}
                    onChange={() =>
                      setValues((p) => ({
                        ...p,
                        reconciliationFrequency: "MONTHLY_2",
                      }))
                    }
                    className="h-4 w-4 border-[var(--input-border)]"
                  />
                  2 раза в месяц
                </label>
              </div>
            ) : (
              <span className="text-[var(--app-text)]">
                {reconciliationFrequencyReadLabel(
                  values.reconciliationFrequency,
                )}
              </span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-2 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <dt className="font-medium text-[var(--text-body)]">Договор подписан</dt>
          <dd className="min-w-0 sm:max-w-xl sm:text-right">
            {editing ? (
              <label className="flex cursor-pointer items-center gap-2 text-[var(--text-strong)] sm:justify-end">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--input-border)]"
                  checked={values.contractSigned}
                  onChange={(e) =>
                    setValues((p) => ({
                      ...p,
                      contractSigned: e.target.checked,
                    }))
                  }
                />
                Да
              </label>
            ) : (
              <span className="text-[var(--app-text)]">{yesNo(values.contractSigned)}</span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-2 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <dt className="font-medium text-[var(--text-body)]">Номер договора</dt>
          <dd className="min-w-0 w-full sm:max-w-xl sm:text-right">
            {editing ? (
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:mt-0"
                placeholder="Например 15/2025-Л"
                value={values.contractNumber}
                onChange={(e) =>
                  setValues((p) => ({ ...p, contractNumber: e.target.value }))
                }
                maxLength={500}
                autoComplete="off"
              />
            ) : (
              <span className="text-[var(--app-text)]">
                {values.contractNumber.trim()
                  ? values.contractNumber.trim()
                  : "—"}
              </span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <dt className="font-medium text-[var(--text-body)]">Работа по ЭДО</dt>
          <dd>
            {editing ? (
              <label className="flex cursor-pointer items-center gap-2 text-[var(--text-strong)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--input-border)]"
                  checked={values.worksWithEdo}
                  onChange={(e) =>
                    setValues((p) => ({ ...p, worksWithEdo: e.target.checked }))
                  }
                />
                Да
              </label>
            ) : (
              <span className="text-[var(--app-text)]">{yesNo(values.worksWithEdo)}</span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
