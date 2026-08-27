/**
 * Имя файла сверки: «СВЕРКА- ЮРЛИЦО-ПЕРИОД».
 * Период — ДД.ММ.ГГГГ-ДД.ММ.ГГГГ (как на бланке, не ISO).
 */

const FILE_ILLEGAL = /[\\/:*?"<>|]+/g;

export function ymdToDottedRu(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd.trim();
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export function sanitizeReconFileLegal(raw: string): string {
  const cleaned = String(raw || "")
    .replace(/[«»„“”"]/g, "")
    .replace(FILE_ILLEGAL, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 80) || "юрлицо";
}

/** Ствол без расширения: СВЕРКА- ОП ООО РЕМИ-16.08.2026-31.08.2026 */
export function reconciliationFileStem(
  legalName: string,
  fromYmd: string,
  toYmd: string,
): string {
  const legal = sanitizeReconFileLegal(legalName);
  const period = `${ymdToDottedRu(fromYmd)}-${ymdToDottedRu(toYmd)}`;
  return `СВЕРКА- ${legal}-${period}`;
}

export function reconciliationFileAsciiStem(fromYmd: string, toYmd: string): string {
  const from = fromYmd.trim() || "from";
  const to = toYmd.trim() || "to";
  return `SVERKA-${from}-${to}`.replace(/[^\w.\-]/g, "_");
}

export function reconciliationAttachmentDisposition(
  utfFileName: string,
  asciiFileName: string,
): string {
  return `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(utfFileName)}`;
}
