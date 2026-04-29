import type { BillingLegalForm } from "@prisma/client";

/** Значение поля «Клиника» в наряде: заказ без привязки к клинике (частная практика). */
export const ORDER_CLINIC_PRIVATE = "__private__";

/** Строка врача в комбобоксе наряда (id + ФИО; прайс — с API клиник). */
export type OrderDoctorComboboxRow = {
  id: string;
  fullName: string;
  orderPriceListKind?: "MAIN" | "CUSTOM" | null;
};

/**
 * Список врачей для выбора в наряде: при выбранной клинике — сначала привязанные к ней,
 * затем остальные (по ФИО). При пустой клинике или «Частная практика» — все врачи
 * справочника (наряд без клиники; любой врач допустим).
 */
export function orderDoctorsForClinicCombobox(
  clinicId: string,
  privatePracticeDoctors: OrderDoctorComboboxRow[],
  clinics: Array<{ id: string; doctors: OrderDoctorComboboxRow[] }>,
  allDoctors: OrderDoctorComboboxRow[],
): OrderDoctorComboboxRow[] {
  if (clinicId === ORDER_CLINIC_PRIVATE || !clinicId) {
    if (allDoctors.length > 0) {
      return [...allDoctors].sort((a, b) =>
        a.fullName.localeCompare(b.fullName, "ru"),
      );
    }
    return [...privatePracticeDoctors].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "ru"),
    );
  }
  const clinic = clinics.find((x) => x.id === clinicId);
  const linked = clinic?.doctors ?? [];
  if (allDoctors.length === 0) return linked;
  const linkedIds = new Set(linked.map((d) => d.id));
  const rest = allDoctors
    .filter((d) => !linkedIds.has(d.id))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));
  return [...linked, ...rest];
}

/** Подпись клиники в select: название и филиал (адрес), если задан. */
export function clinicSelectLabel(clinic: {
  name: string;
  address?: string | null;
  isActive?: boolean;
}): string {
  const addr = clinic.address?.trim();
  const base = addr ? `${clinic.name} — ${addr}` : clinic.name;
  return clinic.isActive === false ? `${base} — неактивна` : base;
}

/** Доп. строки для префиксного поиска в комбобоксе: адрес, юр. наименование, ООО/ИП (кириллица и латиница). */
export function clinicComboboxSearchPrefixes(clinic: {
  address?: string | null;
  legalFullName?: string | null;
  billingLegalForm?: BillingLegalForm | null;
}): string[] {
  const parts: string[] = [];
  const ad = clinic.address?.trim();
  if (ad) parts.push(ad);
  const lf = clinic.legalFullName?.trim();
  if (lf) parts.push(lf);
  const f = clinic.billingLegalForm;
  if (f === "OOO") {
    parts.push("ООО", "OOO");
  } else if (f === "IP") {
    parts.push("ИП", "IP");
  }
  return parts;
}
