/**
 * Подпись счёта в стиле «№376 от 10 февраля 2026» (месяц в родительном падеже).
 * Дата по умолчанию — сегодня по календарю Europe/Moscow.
 */

import {
  extractInvoiceNumberFromDocumentText,
  extractInvoiceNumberFromFileName,
} from "@/lib/invoice-number-extract";

export type InvoiceYmd = { y: number; m0: number; d: number };

const MONTHS_GEN = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

const MONTH_GEN_TO_M0 = new Map<string, number>();
for (let i = 0; i < MONTHS_GEN.length; i++) {
  MONTH_GEN_TO_M0.set(MONTHS_GEN[i]!, i);
}

function normalizeChunk(s: string): string {
  try {
    return s.normalize("NFKC");
  } catch {
    return s;
  }
}

function expandTwoDigitYear(y: number): number {
  if (y >= 100) return y;
  return y < 70 ? 2000 + y : 1900 + y;
}

function isValidCalendarDate(y: number, m0: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m0, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m0 && dt.getUTCDate() === d
  );
}

export function ymdFromDdMmYyOrYyyy(
  day: number,
  month1: number,
  yearRaw: number,
): InvoiceYmd | null {
  const y = expandTwoDigitYear(yearRaw);
  const m0 = month1 - 1;
  if (month1 < 1 || month1 > 12 || day < 1 || day > 31) return null;
  if (!isValidCalendarDate(y, m0, day)) return null;
  return { y, m0, d: day };
}

export function moscowTodayYmd(): InvoiceYmd {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m1 = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return { y, m0: m1 - 1, d };
}

export function formatInvoiceCaptionRu(
  invoiceDigits: string,
  ymd: InvoiceYmd,
): string {
  return `№${invoiceDigits} от ${ymd.d} ${MONTHS_GEN[ymd.m0]!} ${ymd.y}`;
}

/**
 * Ищет в тексте фрагмент «от 10.02.2026» или «от 10 февраля 2026» (первое совпадение).
 */
export function extractYmdAfterOtFromNormalizedText(
  normalizedChunk: string,
): InvoiceYmd | null {
  const c = normalizedChunk;
  /** `\b` в JS не учитывает кириллицу как «слово» — используем отрицательный lookbehind. */
  const reNum =
    /(?<![A-Za-zА-Яа-яЁё0-9_])от\s*(\d{1,2})[./](\d{1,2})[./](\d{4}|\d{2})(?![0-9])/giu;
  reNum.lastIndex = 0;
  const m1 = reNum.exec(c);
  if (m1) {
    const d = Number(m1[1]);
    const mo = Number(m1[2]);
    const yRaw = Number(m1[3]);
    return ymdFromDdMmYyOrYyyy(d, mo, yRaw);
  }
  const reRu =
    /(?<![A-Za-zА-Яа-яЁё0-9_])от\s*(\d{1,2})\s+([а-яё]+)\s+(\d{4})(?:\s*г\.?)?(?![0-9])/giu;
  reRu.lastIndex = 0;
  const m2 = reRu.exec(c);
  if (m2) {
    const d = Number(m2[1]);
    const word = m2[2]!.toLowerCase();
    const m0 = MONTH_GEN_TO_M0.get(word);
    if (m0 == null) return null;
    const y = Number(m2[3]);
    if (!isValidCalendarDate(y, m0, d)) return null;
    return { y, m0, d };
  }
  return null;
}

export function buildInvoiceCaptionRuFromFileName(
  fileName: string,
): string | null {
  const num = extractInvoiceNumberFromFileName(fileName);
  if (!num) return null;
  const base = normalizeChunk(fileName.trim());
  const ymd =
    extractYmdAfterOtFromNormalizedText(base) ?? moscowTodayYmd();
  return formatInvoiceCaptionRu(num, ymd);
}

export function buildInvoiceCaptionRuFromDocumentText(
  text: string,
  opts?: { maxScanChars?: number },
): string | null {
  const num = extractInvoiceNumberFromDocumentText(text, opts);
  if (!num) return null;
  const max = opts?.maxScanChars ?? 12000;
  const chunk = normalizeChunk(text.slice(0, max));
  const ymd =
    extractYmdAfterOtFromNormalizedText(chunk) ?? moscowTodayYmd();
  return formatInvoiceCaptionRu(num, ymd);
}

function collapseInnerSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Приводит ввод пользователя к подписи «№… от …» или возвращает сжатый текст как есть.
 */
export function normalizeInvoiceNumberFieldRu(
  input: string,
): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const digitsOnly = /^\s*(\d{1,12})\s*$/u.exec(raw);
  if (digitsOnly) {
    return formatInvoiceCaptionRu(digitsOnly[1]!, moscowTodayYmd());
  }

  const numSignOnly = /^\s*№\s*(\d{1,12})\s*$/iu.exec(raw);
  if (numSignOnly) {
    return formatInvoiceCaptionRu(
      numSignOnly[1]!.replace(/\s+/g, ""),
      moscowTodayYmd(),
    );
  }

  const dotted =
    /^\s*№\s*(\d{1,12})\s+от\s+(\d{1,2})[./](\d{1,2})[./](\d{4}|\d{2})\s*$/iu.exec(
      raw,
    );
  if (dotted) {
    const n = dotted[1]!.replace(/\s+/g, "");
    const ymd = ymdFromDdMmYyOrYyyy(
      Number(dotted[2]),
      Number(dotted[3]),
      Number(dotted[4]),
    );
    if (ymd) return formatInvoiceCaptionRu(n, ymd);
  }

  const withRuMonth =
    /^\s*№\s*(\d{1,12})\s+от\s+(\d{1,2})\s+([а-яё]+)\s+(\d{4})\s*$/iu.exec(raw);
  if (withRuMonth) {
    const n = withRuMonth[1]!.replace(/\s+/g, "");
    const d = Number(withRuMonth[2]);
    const word = withRuMonth[3]!.toLowerCase();
    const m0 = MONTH_GEN_TO_M0.get(word);
    const y = Number(withRuMonth[4]);
    if (m0 != null && isValidCalendarDate(y, m0, d)) {
      return formatInvoiceCaptionRu(n, { y, m0, d });
    }
  }

  return collapseInnerSpaces(raw);
}
