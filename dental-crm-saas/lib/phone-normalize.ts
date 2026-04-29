/**
 * Нормализация российского номера для сравнения в БД: только цифры, 11 знаков, с ведущей 7.
 * Примеры: 8 903 … → 7903…, +7 … → 7…, 903… → 7903…
 */
export function normalizeRuPhoneDigits(input: string): string | null {
  const raw = (input || "").replace(/\D/g, "");
  if (raw.length === 0) return null;
  let d = raw;
  if (d.length === 10 && d.startsWith("9")) {
    d = `7${d}`;
  } else if (d.length === 11 && d.startsWith("8")) {
    d = `7${d.slice(1)}`;
  } else if (d.length === 11 && d.startsWith("7")) {
    /* ok */
  } else {
    return null;
  }
  if (d.length !== 11 || !d.startsWith("7")) return null;
  return d;
}

/** Синтетическая почта для пользователя, приглашённого только по телефону (поле email обязательно в схеме). */
export function placeholderEmailFromNormalizedPhone(norm: string): string {
  return `p${norm}@invite.crm.local`;
}
