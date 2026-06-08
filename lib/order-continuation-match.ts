/**
 * Сопоставление нарядов для «продолжения работы»: врач + фамилия пациента (первое слово ФИО).
 * Клиника не обязательна.
 */

/** Нормализованная фамилия (первое слово ФИО) для сравнения. */
export function patientSurnameKey(
  patientName: string | null | undefined,
): string {
  if (patientName == null) return "";
  const t = patientName.trim();
  if (!t) return "";
  const first = t.split(/\s+/).filter(Boolean)[0];
  return first ? first.toLocaleLowerCase("ru-RU") : "";
}

export function patientSurnamesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const ka = patientSurnameKey(a);
  const kb = patientSurnameKey(b);
  if (!ka || !kb) return false;
  return ka === kb;
}
