/**
 * Публичная витрина по стикеру: без бренда внешней доски в подписях,
 * дата «Готово» = колонка вида «сдана админам».
 */

/** Колонка CRM, соответствующая «сдана админам» (регистр и пробелы не важны). */
export function isHandedToAdminsKaitenColumnTitle(
  title: string | null | undefined,
): boolean {
  const t = (title ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return false;
  return t.includes("сдан") && t.includes("админ");
}

/** Фрагменты `summary` ревизии, которые считаем «перемещением по доске». */
const MOVEMENT_SUMMARY_MARKERS = [
  "Колонка Кайтен (CRM)",
  "ID карточки Кайтен",
  "Пространство Кайтен",
  "Тип карточки Кайтен",
  "Синхронизация Кайтен",
  "Текст в шапку Кайтен",
  "Кайтен позже",
] as const;

export function stickerRevisionSummaryIsBoardMovement(summary: string): boolean {
  const s = summary.trim();
  if (!s) return false;
  return MOVEMENT_SUMMARY_MARKERS.some((m) => s.includes(m));
}

/** Оставить в строке только части про доску и убрать слово «Кайтен» из подписей. */
export function stickerMovementSummaryForPublic(summary: string): string {
  const parts = summary
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => MOVEMENT_SUMMARY_MARKERS.some((m) => p.includes(m)));
  return parts.map((p) => sanitizeStickerPublicCopy(p)).join(", ");
}

export function sanitizeStickerPublicCopy(text: string): string {
  let t = text.trim();
  t = t.replace(/Колонка Кайтен \(CRM\)/g, "Колонка");
  t = t.replace(/ID карточки Кайтен/g, "Карточка на доске");
  t = t.replace(/Пространство Кайтен/g, "Пространство доски");
  t = t.replace(/Тип карточки Кайтен/g, "Тип карточки");
  t = t.replace(/Синхронизация Кайтен/g, "Синхронизация с доской");
  t = t.replace(/Текст в шапку Кайтен/g, "Текст в шапку");
  t = t.replace(/Кайтен позже/g, "Колонку уточним позже");
  /* «в Kaiten»: \b у кириллицы «в» ненадёжен — явный фрагмент */
  t = t.replace(/в\s+Kaiten\b/gi, "на доске");
  t = t.replace(/\bKaiten\b/gi, "");
  t = t.replace(/\s{2,}/g, " ").replace(/^\s+|\s+$/g, "").trim();
  return t;
}
