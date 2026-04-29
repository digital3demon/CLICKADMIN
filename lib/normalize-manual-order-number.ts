const MAX_LEN = 64;

/** Ручной ввод номера наряда перед сохранением в БД. */
export function normalizeManualOrderNumber(
  raw: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  const s = String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!s) {
    return { ok: false, error: "Укажите номер наряда" };
  }
  if (s.length > MAX_LEN) {
    return {
      ok: false,
      error: `Номер слишком длинный (не более ${MAX_LEN} символов)`,
    };
  }
  if (/[\r\n\t]/.test(s)) {
    return { ok: false, error: "Номер не может содержать переносы и табуляцию" };
  }
  return { ok: true, value: s };
}
