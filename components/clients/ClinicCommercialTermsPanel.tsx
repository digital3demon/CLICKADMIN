"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

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
  hasContractDoc: boolean;
  worksWithEdo: boolean;
};

type ContractDraftValues = {
  contractNumber: string;
  contractDate: string;
  orgShortName: string;
  inn: string;
  ceoName: string;
  email: string;
  requisitesLine: string;
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

function emptyContractDraftValues(): ContractDraftValues {
  return {
    contractNumber: "",
    contractDate: "",
    orgShortName: "",
    inn: "",
    ceoName: "",
    email: "",
    requisitesLine: "",
  };
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
  const [hasContractDoc, setHasContractDoc] = useState(initial.hasContractDoc);
  const [contractBusy, setContractBusy] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftValues, setDraftValues] = useState<ContractDraftValues>(
    emptyContractDraftValues(),
  );
  const [editorText, setEditorText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initialKey = useMemo(() => JSON.stringify(initial), [initial]);

  useEffect(() => {
    if (!editing) setValues(initial);
    setHasContractDoc(initial.hasContractDoc);
  }, [initialKey, editing, initial]);

  const openCreateContract = async () => {
    setContractBusy(true);
    setContractError(null);
    try {
      const res = await fetch(`/api/clinics/${clinicId}/contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prefill" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.values) {
        setContractError(
          typeof data.error === "string"
            ? data.error
            : "Не удалось подготовить договор",
        );
        return;
      }
      setDraftValues({
        contractNumber: String(data.values.contractNumber ?? ""),
        contractDate: String(data.values.contractDate ?? ""),
        orgShortName: String(data.values.orgShortName ?? ""),
        inn: String(data.values.inn ?? ""),
        ceoName: String(data.values.ceoName ?? ""),
        email: String(data.values.email ?? ""),
        requisitesLine: String(data.values.requisitesLine ?? ""),
      });
      setDraftOpen(true);
    } catch {
      setContractError("Сеть или сервер недоступны");
    } finally {
      setContractBusy(false);
    }
  };

  const openEditorWithDraft = async () => {
    setContractBusy(true);
    setContractError(null);
    try {
      const res = await fetch(`/api/clinics/${clinicId}/contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assemble", values: draftValues }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.editorText !== "string") {
        setContractError(
          typeof data.error === "string" ? data.error : "Не удалось собрать договор",
        );
        return;
      }
      setEditorText(data.editorText);
      setDraftOpen(false);
      setEditorOpen(true);
    } catch {
      setContractError("Сеть или сервер недоступны");
    } finally {
      setContractBusy(false);
    }
  };

  const saveGeneratedContract = async () => {
    setContractBusy(true);
    setContractError(null);
    try {
      const res = await fetch(`/api/clinics/${clinicId}/contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-generated",
          values: draftValues,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setContractError(
          typeof data.error === "string" ? data.error : "Не удалось сохранить договор",
        );
        return;
      }
      setValues((p) => ({
        ...p,
        contractSigned: true,
        contractNumber: String(data.contractNumber ?? draftValues.contractNumber),
      }));
      setHasContractDoc(true);
      setEditorOpen(false);
      router.refresh();
    } catch {
      setContractError("Сеть или сервер недоступны");
    } finally {
      setContractBusy(false);
    }
  };

  const onUploadContract = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setContractBusy(true);
    setContractError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(`/api/clinics/${clinicId}/contract`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setContractError(
          typeof data.error === "string" ? data.error : "Не удалось загрузить договор",
        );
        return;
      }
      const parsedNumber =
        typeof data.contractNumber === "string" ? data.contractNumber : "";
      setValues((p) => ({
        ...p,
        contractSigned: true,
        contractNumber: parsedNumber || p.contractNumber,
      }));
      setHasContractDoc(true);
      router.refresh();
    } catch {
      setContractError("Сеть или сервер недоступны");
    } finally {
      setContractBusy(false);
    }
  };

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
        hasContractDoc,
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
          {hasContractDoc ? (
            <a
              href={`/api/clinics/${clinicId}/contract`}
              className={`${btnBase} border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-body)] hover:bg-[var(--table-row-hover)]`}
            >
              Скачать договор
            </a>
          ) : null}
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
      {contractError ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {contractError}
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
              <div className="space-y-2">
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:mt-0"
                  placeholder="Например 2605-001"
                  value={values.contractNumber}
                  onChange={(e) =>
                    setValues((p) => ({ ...p, contractNumber: e.target.value }))
                  }
                  maxLength={500}
                  autoComplete="off"
                />
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    disabled={contractBusy}
                    className={`${btnBase} border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-body)] hover:bg-[var(--table-row-hover)] disabled:opacity-50`}
                    onClick={() => void openCreateContract()}
                  >
                    Создать договор
                  </button>
                  <button
                    type="button"
                    disabled={contractBusy}
                    className={`${btnBase} border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-body)] hover:bg-[var(--table-row-hover)] disabled:opacity-50`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Загрузить договор
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => void onUploadContract(e)}
                  />
                </div>
              </div>
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

      {draftOpen ? (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/45 p-4">
          <div
            className="w-full max-w-2xl rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-base font-semibold text-[var(--text-body)]">
              Проверка данных договора
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Поля взяты из карточки контрагента. Можно поправить перед сборкой.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-[var(--text-secondary)]">Номер договора</span>
                <input
                  className="w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm"
                  value={draftValues.contractNumber}
                  onChange={(e) =>
                    setDraftValues((p) => ({ ...p, contractNumber: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[var(--text-secondary)]">Дата договора</span>
                <input
                  className="w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm"
                  value={draftValues.contractDate}
                  onChange={(e) =>
                    setDraftValues((p) => ({ ...p, contractDate: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[var(--text-secondary)]">Наименование (кратко)</span>
                <input
                  className="w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm"
                  value={draftValues.orgShortName}
                  onChange={(e) =>
                    setDraftValues((p) => ({ ...p, orgShortName: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[var(--text-secondary)]">ИНН</span>
                <input
                  className="w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm"
                  value={draftValues.inn}
                  onChange={(e) =>
                    setDraftValues((p) => ({ ...p, inn: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[var(--text-secondary)]">ФИО руководителя</span>
                <input
                  className="w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm"
                  value={draftValues.ceoName}
                  onChange={(e) =>
                    setDraftValues((p) => ({ ...p, ceoName: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[var(--text-secondary)]">Email</span>
                <input
                  className="w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm"
                  value={draftValues.email}
                  onChange={(e) =>
                    setDraftValues((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-[var(--text-secondary)]">Реквизиты строкой</span>
                <textarea
                  className="min-h-20 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm"
                  value={draftValues.requisitesLine}
                  onChange={(e) =>
                    setDraftValues((p) => ({ ...p, requisitesLine: e.target.value }))
                  }
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={`${btnBase} border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-body)]`}
                onClick={() => setDraftOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={contractBusy}
                className={`${btnBase} bg-[var(--sidebar-blue)] text-white disabled:opacity-50`}
                onClick={() => void openEditorWithDraft()}
              >
                Продолжить
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editorOpen ? (
        <div className="fixed inset-0 z-[245] flex items-center justify-center bg-black/45 p-4">
          <div
            className="w-full max-w-4xl rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-base font-semibold text-[var(--text-body)]">
              Текст договора
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Предпросмотр текста. Форматирование Word сохраняется по шаблону при
              нажатии «Сохранить».
            </p>
            <div className="mt-3 max-h-[55vh] overflow-auto rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] p-4">
              <div className="mx-auto w-full max-w-[820px] rounded-sm border border-zinc-300 bg-white px-10 py-8 text-[15px] leading-7 text-zinc-900 shadow-sm">
                {editorText.split("\n").map((line, idx) => (
                  <p key={`${idx}-${line.slice(0, 16)}`} className="whitespace-pre-wrap">
                    {line.length > 0 ? line : "\u00A0"}
                  </p>
                ))}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={`${btnBase} border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-body)]`}
                onClick={() => {
                  setEditorOpen(false);
                  setDraftOpen(true);
                }}
              >
                Назад
              </button>
              <button
                type="button"
                disabled={contractBusy}
                className={`${btnBase} bg-emerald-600 text-white disabled:opacity-50`}
                onClick={() => void saveGeneratedContract()}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
