/**
 * Номер УПД / счёта-фактуры из имени файла и текста.
 * Не путать со «Счёт на оплату №». Без `\b` — кириллица вокруг «№ … от».
 */

const MAX_DIGITS = 12;
const GAP = 220;

/** После NFKC знак «№» часто становится «No». */
const NUM_MARK = String.raw`(?:№|N[oо]\.?)`;

const UPD_TITLE_NUM = new RegExp(
  String.raw`(?:упд|сч[её]т[-\s]?фактур\w*)[\s\S]{0,${GAP}}?${NUM_MARK}\s*([0-9]{1,${MAX_DIGITS}})`,
  "iu",
);

const NUM_SPACE_OT = new RegExp(
  String.raw`${NUM_MARK}\s*([0-9]{1,${MAX_DIGITS}})\s+от`,
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
  return /^\d+$/.test(d) ? d : null;
}

export function extractUpdDigitsFromFileName(fileName: string): string | null {
  const base = normalizeName(fileName.replace(/_/g, " ").trim());
  if (!base) return null;
  UPD_TITLE_NUM.lastIndex = 0;
  const titled = takeDigits(UPD_TITLE_NUM.exec(base));
  if (titled) return titled;
  NUM_SPACE_OT.lastIndex = 0;
  return takeDigits(NUM_SPACE_OT.exec(base));
}

export function extractUpdDigitsFromDocumentText(
  text: string,
  opts?: { maxScanChars?: number },
): string | null {
  const max = opts?.maxScanChars ?? 12000;
  const chunk = normalizeName(text.slice(0, max));
  UPD_TITLE_NUM.lastIndex = 0;
  const titled = takeDigits(UPD_TITLE_NUM.exec(chunk));
  if (titled) return titled;
  NUM_SPACE_OT.lastIndex = 0;
  return takeDigits(NUM_SPACE_OT.exec(chunk));
}

export function normalizeUpdDigitsInput(raw: string): string {
  const d = String(raw || "").replace(/\D/g, "");
  return d.slice(0, MAX_DIGITS);
}
