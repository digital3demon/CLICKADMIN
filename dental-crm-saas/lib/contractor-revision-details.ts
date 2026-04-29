import type { BillingLegalForm, ReconciliationFrequency } from "@prisma/client";

/** Версия формата JSON в ContractorRevision.details */
export const CONTRACTOR_REVISION_DETAILS_VERSION = 1 as const;

export type ContractorRevisionChangeRow = {
  label: string;
  before: string | null;
  after: string | null;
};

export type ContractorRevisionDetailsV1 =
  | {
      version: typeof CONTRACTOR_REVISION_DETAILS_VERSION;
      mode: "update";
      headline: string;
      changes: ContractorRevisionChangeRow[];
    }
  | {
      version: typeof CONTRACTOR_REVISION_DETAILS_VERSION;
      mode: "delete";
      headline: string;
      snapshot: { label: string; value: string | null }[];
    };

function isBlankDisplay(s: string | null): boolean {
  return s == null || s.trim() === "";
}

export function formatDoctorFieldForRevision(
  key: string,
  value: unknown,
): string | null {
  if (value == null) return null;
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (key === "telegramUsername") {
    const s = String(value).trim().replace(/^@+/, "");
    return s.length ? `@${s}` : null;
  }
  const s = String(value).trim();
  return s.length ? s : null;
}

export function formatClinicFieldForRevision(
  key: string,
  value: unknown,
): string | null {
  if (value == null) return null;
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (key === "billingLegalForm") {
    const v = value as BillingLegalForm | null;
    if (v === "IP") return "ИП";
    if (v === "OOO") return "ООО";
    return null;
  }
  if (key === "reconciliationFrequency") {
    const v = value as ReconciliationFrequency | null;
    if (v === "MONTHLY_1") return "1 раз в месяц";
    if (v === "MONTHLY_2") return "2 раза в месяц";
    return null;
  }
  const s = String(value).trim();
  return s.length ? s : null;
}

export function buildDoctorUpdateDetails(input: {
  labels: Record<string, string>;
  patchKeys: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  headline: string;
}): ContractorRevisionDetailsV1 {
  const changes: ContractorRevisionChangeRow[] = [];
  for (const key of input.patchKeys) {
    const label = input.labels[key] ?? key;
    const b = formatDoctorFieldForRevision(key, input.before[key]);
    const a = formatDoctorFieldForRevision(key, input.after[key]);
    if (b === a) continue;
    changes.push({ label, before: b, after: a });
  }
  return {
    version: CONTRACTOR_REVISION_DETAILS_VERSION,
    mode: "update",
    headline: input.headline,
    changes,
  };
}

export function buildClinicUpdateDetails(input: {
  labels: Record<string, string>;
  patchKeys: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  headline: string;
}): ContractorRevisionDetailsV1 {
  const changes: ContractorRevisionChangeRow[] = [];
  for (const key of input.patchKeys) {
    const label = input.labels[key] ?? key;
    const b = formatClinicFieldForRevision(key, input.before[key]);
    const a = formatClinicFieldForRevision(key, input.after[key]);
    if (b === a) continue;
    changes.push({ label, before: b, after: a });
  }
  return {
    version: CONTRACTOR_REVISION_DETAILS_VERSION,
    mode: "update",
    headline: input.headline,
    changes,
  };
}

const DOCTOR_SNAPSHOT_ORDER: { key: string; label: string }[] = [
  { key: "fullName", label: "ФИО" },
  { key: "lastName", label: "Фамилия" },
  { key: "firstName", label: "Имя" },
  { key: "patronymic", label: "Отчество" },
  { key: "formerLastName", label: "Фамилия ранее" },
  { key: "specialty", label: "Специальность" },
  { key: "city", label: "Город" },
  { key: "email", label: "E-mail" },
  { key: "clinicWorkEmail", label: "Почта клиники" },
  { key: "phone", label: "Телефон" },
  { key: "preferredContact", label: "Связь" },
  { key: "telegramUsername", label: "Telegram" },
  { key: "birthday", label: "День рождения" },
  { key: "particulars", label: "Особенности" },
  { key: "acceptsPrivatePractice", label: "Частная практика" },
];

export function buildDoctorDeleteDetails(row: Record<string, unknown>): ContractorRevisionDetailsV1 {
  const fullName = formatDoctorFieldForRevision("fullName", row.fullName) ?? "—";
  const snapshot: { label: string; value: string | null }[] = [];
  for (const { key, label } of DOCTOR_SNAPSHOT_ORDER) {
    const v = formatDoctorFieldForRevision(key, row[key]);
    snapshot.push({ label, value: v });
  }
  return {
    version: CONTRACTOR_REVISION_DETAILS_VERSION,
    mode: "delete",
    headline: `Врач «${fullName}» удалён`,
    snapshot,
  };
}

const CLINIC_SNAPSHOT_ORDER: { key: string; label: string }[] = [
  { key: "name", label: "Название" },
  { key: "address", label: "Адрес" },
  { key: "isActive", label: "Активна" },
  { key: "notes", label: "Заметки" },
  { key: "legalFullName", label: "Юр. наименование" },
  { key: "legalAddress", label: "Юр. адрес" },
  { key: "inn", label: "ИНН" },
  { key: "kpp", label: "КПП" },
  { key: "ogrn", label: "ОГРН" },
  { key: "bankName", label: "Банк" },
  { key: "bik", label: "БИК" },
  { key: "settlementAccount", label: "Р/с" },
  { key: "correspondentAccount", label: "К/с" },
  { key: "phone", label: "Телефон" },
  { key: "email", label: "E-mail" },
  { key: "ceoName", label: "Руководитель" },
  { key: "worksWithReconciliation", label: "Сверка" },
  { key: "reconciliationFrequency", label: "Периодичность сверки" },
  { key: "contractSigned", label: "Договор подписан" },
  { key: "contractNumber", label: "Номер договора" },
  { key: "worksWithEdo", label: "ЭДО" },
  { key: "billingLegalForm", label: "Юрлицо (ИП/ООО)" },
];

export function buildClinicDeleteDetails(row: Record<string, unknown>): ContractorRevisionDetailsV1 {
  const nameRaw = row.name;
  const nameStr =
    typeof nameRaw === "string"
      ? nameRaw.split("\n")[0]?.trim() || "Клиника"
      : "Клиника";
  const snapshot: { label: string; value: string | null }[] = [];
  for (const { key, label } of CLINIC_SNAPSHOT_ORDER) {
    const v = formatClinicFieldForRevision(key, row[key]);
    snapshot.push({ label, value: v });
  }
  return {
    version: CONTRACTOR_REVISION_DETAILS_VERSION,
    mode: "delete",
    headline: `Клиника «${nameStr}» удалена`,
    snapshot,
  };
}

/** Для клиента: проверка и разбор details из API */
export function parseContractorRevisionDetails(
  raw: unknown,
): ContractorRevisionDetailsV1 | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== CONTRACTOR_REVISION_DETAILS_VERSION) return null;
  if (o.mode === "update") {
    if (typeof o.headline !== "string" || !Array.isArray(o.changes)) return null;
    const changes: ContractorRevisionChangeRow[] = [];
    for (const item of o.changes) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      if (typeof r.label !== "string") continue;
      changes.push({
        label: r.label,
        before: r.before == null ? null : String(r.before),
        after: r.after == null ? null : String(r.after),
      });
    }
    return {
      version: CONTRACTOR_REVISION_DETAILS_VERSION,
      mode: "update",
      headline: o.headline,
      changes,
    };
  }
  if (o.mode === "delete") {
    if (typeof o.headline !== "string" || !Array.isArray(o.snapshot)) return null;
    const snapshot: { label: string; value: string | null }[] = [];
    for (const item of o.snapshot) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      if (typeof r.label !== "string") continue;
      snapshot.push({
        label: r.label,
        value: r.value == null ? null : String(r.value),
      });
    }
    return {
      version: CONTRACTOR_REVISION_DETAILS_VERSION,
      mode: "delete",
      headline: o.headline,
      snapshot,
    };
  }
  return null;
}

export function describeChangeLine(ch: ContractorRevisionChangeRow): string {
  if (isBlankDisplay(ch.before)) {
    return `${ch.label}: внесение данных`;
  }
  if (isBlankDisplay(ch.after)) {
    return `${ch.label}: было «${ch.before}» → очищено`;
  }
  return `${ch.label}: было «${ch.before}» → «${ch.after}»`;
}
