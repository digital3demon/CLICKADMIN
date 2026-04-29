/**
 * Извлечение номера счёта на оплату (РФ): из имени файла и из текста PDF.
 * Приоритет — явная строка «Счёт/счет на оплату … № …»; затем «№ … от» (как в типовых названиях файлов).
 */

const MAX_REASONABLE_INVOICE_DIGITS = 12;

/** «Счет на оплату № 178» / «Счёт на оплату №178» и варианты с N/No. */
/** В PDF между словами и «№» часто много переносов/пробелов. */
const GAP_TITLE_TO_NUM = 220;

const INVOICE_TITLE_NUM = new RegExp(
  String.raw`сч(?:ет|ёт)\s+на\s+оплату[\s\S]{0,` +
    GAP_TITLE_TO_NUM +
    String.raw`}?№\s*([0-9]{1,` +
    MAX_REASONABLE_INVOICE_DIGITS +
    String.raw`})`,
  "iu",
);

/** Латиница: редкие выгрузки с "N" вместо "№". */
const INVOICE_TITLE_NUM_LATIN_N = new RegExp(
  String.raw`сч(?:ет|ёт)\s+на\s+оплату[\s\S]{0,` +
    GAP_TITLE_TO_NUM +
    String.raw`}?(?:№|N(?:o\.?|\.))\s*([0-9]{1,` +
    MAX_REASONABLE_INVOICE_DIGITS +
    String.raw`})`,
  "iu",
);

/** В названии файла часто: «… № 178 от 10.02.2026». */
const NUM_SPACE_OT = new RegExp(
  String.raw`№\s*([0-9]{1,` +
    MAX_REASONABLE_INVOICE_DIGITS +
    String.raw`})\s+от`,
  "iu",
);

const NUM_SPACE_OT_LATIN = new RegExp(
  String.raw`(?:№|N(?:o\.?|\.))\s*([0-9]{1,` +
    MAX_REASONABLE_INVOICE_DIGITS +
    String.raw`})\s+от`,
  "iu",
);

function normalizeName(s: string): string {
  try {
    return s.normalize("NFKC");
  } catch {
    return s;
  }
}

function takeDigits(m: RegExpExecArray | null): string | null {
  if (!m?.[1]) return null;
  const d = m[1].replace(/\s+/g, "");
  if (!/^\d+$/.test(d)) return null;
  return d;
}

/**
 * Номер из имени файла (до расширения учитывается вся строка).
 */
export function extractInvoiceNumberFromFileName(fileName: string): string | null {
  const base = normalizeName(fileName.trim());
  if (!base) return null;

  for (const re of [INVOICE_TITLE_NUM, INVOICE_TITLE_NUM_LATIN_N]) {
    re.lastIndex = 0;
    const m = re.exec(base);
    const n = takeDigits(m);
    if (n) return n;
  }
  for (const re of [NUM_SPACE_OT, NUM_SPACE_OT_LATIN]) {
    re.lastIndex = 0;
    const m = re.exec(base);
    const n = takeDigits(m);
    if (n) return n;
  }
  return null;
}

/**
 * Номер из распознанного текста PDF (достаточно первой страницы).
 * Сначала ищем заголовок счёта, чтобы не спутать с КПП/договорами.
 */
export function extractInvoiceNumberFromDocumentText(
  text: string,
  opts?: { maxScanChars?: number },
): string | null {
  const max = opts?.maxScanChars ?? 12000;
  const chunk = normalizeName(text.slice(0, max));

  for (const re of [INVOICE_TITLE_NUM, INVOICE_TITLE_NUM_LATIN_N]) {
    re.lastIndex = 0;
    const m = re.exec(chunk);
    const n = takeDigits(m);
    if (n) return n;
  }
  for (const re of [NUM_SPACE_OT, NUM_SPACE_OT_LATIN]) {
    re.lastIndex = 0;
    const m = re.exec(chunk);
    const n = takeDigits(m);
    if (n) return n;
  }
  return null;
}

export function isProbablyPdf(
  mimeType: string,
  fileName: string,
): boolean {
  const m = mimeType.toLowerCase();
  if (m === "application/pdf" || m.includes("pdf")) return true;
  return /\.pdf\s*$/i.test(fileName.trim());
}
