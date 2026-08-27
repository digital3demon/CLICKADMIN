/**
 * Ключ группы сверки ФинОтдела: ИНН клиники (цифры).
 * Без ИНН клиники не склеиваем.
 */

export function normalizeClinicInnDigits(
  inn: string | null | undefined,
): string | null {
  const digits = String(inn ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits;
}

export function foReconciliationGroupKey(clinic: {
  id: string;
  inn: string | null | undefined;
}): string {
  const inn = normalizeClinicInnDigits(clinic.inn);
  return inn ? `inn:${inn}` : `clinic:${clinic.id}`;
}

export function clinicScopeGroupKey(clinicId: string): string {
  return `clinic:${clinicId.trim()}`;
}
