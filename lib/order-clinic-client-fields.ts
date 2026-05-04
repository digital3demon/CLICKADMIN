/** Значение «Оплата» в наряде (как в БД и старых данных). */
export const ORDER_PAYMENT_SVERKA = "СВЕРКА" as const;
export const ORDER_PAYMENT_NOT_PAID = "Не оплачено" as const;
export const ORDER_PAYMENT_EXPECTED = "Ожидает оплаты" as const;
export const ORDER_PAYMENT_PARTIAL = "Частично оплачено" as const;
export const ORDER_PAYMENT_PAID = "Оплачено" as const;
export const ORDER_PAYMENT_RECON_UNPAID = "Сверка-НЕ ОПЛАЧЕНО" as const;
export const ORDER_PAYMENT_RECON_PAID = "Сверка-ОПЛАЧЕНО" as const;

const LEGAL_PLACEHOLDER = "Выбрать из списка" as const;

/**
 * «От какого юрлица работаем» в карточке клиники → пункт списка «Юр. лицо» в наряде.
 * Не указано в карточке → плейсхолдер (пусто по смыслу).
 */
export function legalEntitySelectFromClinicBilling(
  billingLegalForm: "IP" | "OOO" | null | undefined,
): typeof LEGAL_PLACEHOLDER | "ИП" | "ООО" {
  if (billingLegalForm === "IP") return "ИП";
  if (billingLegalForm === "OOO") return "ООО";
  return LEGAL_PLACEHOLDER;
}

/** Подпись пункта «СВЕРКА» в select «Оплата» (value остаётся ORDER_PAYMENT_SVERKA). */
export function sverkaPaymentSelectLabel(
  reconciliationFrequency: "MONTHLY_1" | "MONTHLY_2" | null | undefined,
): string {
  if (reconciliationFrequency === "MONTHLY_1") return "Сверка · 1 раз в месяц";
  if (reconciliationFrequency === "MONTHLY_2") return "Сверка · 2 раза в месяц";
  return "Сверка";
}

export function isReconciliationPaymentStatus(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  return (
    v === ORDER_PAYMENT_RECON_UNPAID ||
    v === ORDER_PAYMENT_RECON_PAID ||
    v === ORDER_PAYMENT_SVERKA
  );
}

/** Если текущее значение не входит в список — добавляем в начало (старые/кастомные данные). */
export function withExtraSelectOption<T extends string>(
  options: readonly T[],
  current: string | null | undefined,
): T[] {
  const c = (current ?? "").trim();
  if (!c) return [...options];
  if ((options as readonly string[]).includes(c)) return [...options];
  return [c as T, ...options];
}
