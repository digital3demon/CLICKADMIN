/**
 * Парсинг дат из текста писем (RU): 12.06, 12.06.26, «15 июня».
 * Год по умолчанию — текущий или из referenceDate.
 */

const RU_MONTHS: Record<string, number> = {
  январ: 1,
  феврал: 2,
  март: 3,
  апрел: 4,
  ма: 5,
  июн: 6,
  июл: 7,
  август: 8,
  сентябр: 9,
  октябр: 10,
  ноябр: 11,
  декабр: 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt.toISOString();
}

/** DD.MM или DD.MM.YY(YY) */
export function parseRuDotDate(
  raw: string,
  referenceDate: Date = new Date(),
): string | null {
  const m = raw.trim().match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = referenceDate.getFullYear();
  if (m[3]) {
    const y = Number(m[3]);
    year = y < 100 ? 2000 + y : y;
  }
  return toIsoDate(year, month, day);
}

/** «15 июня», «15 июн» */
export function parseRuMonthNameDate(
  raw: string,
  referenceDate: Date = new Date(),
): string | null {
  const m = raw
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})\s+([а-яё]+)/u);
  if (!m) return null;
  const day = Number(m[1]);
  const monthPrefix = m[2].slice(0, 5);
  let month: number | undefined;
  for (const [prefix, num] of Object.entries(RU_MONTHS)) {
    if (monthPrefix.startsWith(prefix.slice(0, Math.min(prefix.length, monthPrefix.length)))) {
      month = num;
      break;
    }
  }
  if (!month) {
    for (const [prefix, num] of Object.entries(RU_MONTHS)) {
      if (prefix.startsWith(monthPrefix) || monthPrefix.startsWith(prefix.slice(0, 3))) {
        month = num;
        break;
      }
    }
  }
  if (!month) return null;
  return toIsoDate(referenceDate.getFullYear(), month, day);
}

/** Первая распознанная дата в фрагменте; при «или» — первая + ambiguous. */
export function parseFirstDateFromText(
  text: string,
  referenceDate: Date = new Date(),
): { iso: string | null; ambiguous: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { iso: null, ambiguous: false };

  const ambiguous =
    // \b не работает с кириллицей — явная граница вокруг «или»
    /(?:^|\s)или(?:\s|$|[,.!?])/iu.test(trimmed) &&
    (/\d{1,2}[./]\d{1,2}/.test(trimmed) ||
      /\d{1,2}\s+[а-яё]+/iu.test(trimmed));

  const dotMatches = [...trimmed.matchAll(/(\d{1,2}\.\d{1,2}(?:\.\d{2,4})?)/g)];
  for (const dm of dotMatches) {
    const iso = parseRuDotDate(dm[1], referenceDate);
    if (iso) return { iso, ambiguous };
  }

  const monthMatches = [
    ...trimmed.matchAll(/(\d{1,2})\s+([а-яё]{3,})/giu),
  ];
  for (const mm of monthMatches) {
    const iso = parseRuMonthNameDate(`${mm[1]} ${mm[2]}`, referenceDate);
    if (iso) return { iso, ambiguous };
  }

  return { iso: null, ambiguous };
}

export function parseOptionalIsoDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    const parsed = parseFirstDateFromText(v);
    return parsed.iso;
  }
  return null;
}
