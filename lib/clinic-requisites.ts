/** Поля реквизитов клиники: ключ Prisma → подпись во вкладке «Реквизиты». */
export const CLINIC_REQUISITE_ROWS = [
  { key: "legalFullName", label: "Наименование" },
  { key: "legalAddress", label: "Юридический адрес" },
  { key: "inn", label: "ИНН" },
  { key: "kpp", label: "КПП" },
  { key: "ogrn", label: "ОГРН" },
  { key: "bankName", label: "Банк" },
  { key: "bik", label: "БИК" },
  { key: "settlementAccount", label: "Расчётный счёт" },
  { key: "correspondentAccount", label: "Корр. счёт" },
  { key: "phone", label: "Телефон администраторов" },
  { key: "phoneAccounting", label: "Телефон бухгалтерии" },
  { key: "phoneManagement", label: "Телефон руководства" },
  { key: "email", label: "E-mail" },
  { key: "invoiceEmail", label: "E-mail для отправки счёта" },
  { key: "ceoName", label: "Руководитель" },
] as const;

export type ClinicRequisiteKey = (typeof CLINIC_REQUISITE_ROWS)[number]["key"];

export type ClinicCopySource = {
  name: string;
  address: string | null;
  /** Обычный e-mail клиники можно слать счета, если нет invoiceEmail. */
  useEmailForInvoices: boolean;
} & Partial<Record<ClinicRequisiteKey, string | null>>;

/** Состояние формы «Реквизиты» из записи клиники (сервер → RequisitesPanel). */
export function requisitesFormStateFromClinic(
  clinic: {
    name: string;
    address: string | null;
    useEmailForInvoices?: boolean | null;
  } & Partial<Record<ClinicRequisiteKey, string | null>>,
): ClinicCopySource {
  const base = {
    name: clinic.name,
    address: clinic.address ?? "",
    useEmailForInvoices: clinic.useEmailForInvoices === true,
  };
  const rest = {} as Record<ClinicRequisiteKey, string>;
  for (const { key } of CLINIC_REQUISITE_ROWS) {
    const v = clinic[key];
    rest[key] = v != null ? String(v) : "";
  }
  return { ...base, ...rest };
}

/** Текст для копирования реквизитов (и краткого названия с адресом). */
export function buildClinicRequisitesCopyText(clinic: ClinicCopySource): string {
  const lines: string[] = [];
  lines.push(`Краткое название: ${clinic.name?.trim() || "—"}`);
  lines.push(`Адрес: ${clinic.address?.trim() ? clinic.address.trim() : "—"}`);
  lines.push(
    `E-mail использовать для счетов: ${clinic.useEmailForInvoices ? "да" : "нет"}`,
  );
  for (const { key, label } of CLINIC_REQUISITE_ROWS) {
    const v = clinic[key];
    const s = v != null && String(v).trim() ? String(v).trim() : "—";
    lines.push(`${label}: ${s}`);
  }
  return lines.join("\n");
}
