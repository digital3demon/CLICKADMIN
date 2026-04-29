/** Значение «Оплата» в наряде (как в БД и старых данных). */
export const ORDER_PAYMENT_SVERKA = "СВЕРКА" as const;

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
  if (reconciliationFrequency === "MONTHLY_1") {
    return "СВЕРКА · 1 раз в месяц";
  }
  if (reconciliationFrequency === "MONTHLY_2") {
    return "СВЕРКА · 2 раза в месяц";
  }
  return ORDER_PAYMENT_SVERKA;
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
