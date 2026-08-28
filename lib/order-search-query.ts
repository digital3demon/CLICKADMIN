/**
 * Поиск наряда по вставке из документооборота
 * («2608-325 Загоскина Я. Самус Н. Э.»).
 * Timezone не используется. Границы — не JS `\b` (кириллица не словесная).
 */

/** Латиница, визуально как кириллица — после toLocaleLowerCase. */
const LAT_LOOKALIKE_TO_CYR: Record<string, string> = {
  a: "а",
  e: "е",
  o: "о",
  p: "р",
  c: "с",
  x: "х",
  y: "у",
  t: "т",
  h: "н",
  k: "к",
  m: "м",
  b: "в",
};

export function foldOrderSearchText(raw: string): string {
  return String(raw || "")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[aeopcxythkmb]/g, (ch) => LAT_LOOKALIKE_TO_CYR[ch] ?? ch);
}

/**
 * Первый номер YYMM-NNN в запросе (дефис / тире).
 * Lookbehind/ahead по цифре, не `\b`: рядом часто кириллица.
 */
export function extractOrderNumberFromSearchQuery(
  raw: string,
): string | null {
  const src = String(raw || "");
  const re = /(?<!\d)(\d{4}[-–—]\d{2,4})(?!\d)/gu;
  const m = re.exec(src);
  if (!m?.[1]) return null;
  return m[1].replace(/[–—]/g, "-");
}

/** Номер наряда или фамилии; инициалы «Я.» / «Н. Э.» не обязательны. */
export function orderSearchSignificantTokens(raw: string): string[] {
  const folded = foldOrderSearchText(raw).replace(/[–—]/g, "-");
  if (!folded.trim()) return [];
  const tokens = folded
    .split(/[^\p{L}\p{N}-]+/u)
    .map((t) => t.replace(/^-+|-+$/g, ""))
    .filter(Boolean)
    .filter((t) => {
      if (/^\d{4}-\d{2,4}$/.test(t)) return true;
      if (/^\d+$/.test(t)) return t.length >= 1;
      return [...t].length >= 2;
    });
  return tokens;
}

export function haystackDigitRuns(folded: string): string[] {
  return String(folded || "").match(/\d+/g) ?? [];
}

export function orderSearchTokenMatchesHaystack(
  token: string,
  foldedHay: string,
): boolean {
  if (/^\d+$/.test(token)) {
    const runs = haystackDigitRuns(foldedHay);
    if (runs.includes(token)) return true;
    /* «079» в «2606079» без дефиса. Короче 3 не суффиксим: «14» ≠ «214». */
    if (token.length >= 3) {
      return runs.some(
        (run) => run.length > token.length && run.endsWith(token),
      );
    }
    return false;
  }
  return foldedHay.includes(token);
}

/**
 * Совпадение стога с запросом: номер из документооборота достаточен;
 * иначе все значимые токены (AND).
 */
export function textMatchesOrderSearch(
  haystack: string,
  query: string,
): boolean {
  const q = String(query || "").trim();
  if (!q) return true;
  const foldedHay = foldOrderSearchText(haystack);
  const orderNumber = extractOrderNumberFromSearchQuery(q);
  if (orderNumber) {
    const numFolded = foldOrderSearchText(orderNumber);
    if (foldedHay.includes(numFolded)) return true;
    const compact = orderNumber.replace(/-/g, "");
    if (
      compact.length >= 6 &&
      haystackDigitRuns(foldedHay).some(
        (run) => run === compact || run.endsWith(compact),
      )
    ) {
      return true;
    }
  }
  const tokens = orderSearchSignificantTokens(q);
  if (tokens.length === 0) {
    const foldedQ = foldOrderSearchText(q).replace(/\s+/g, " ").trim();
    return !foldedQ || foldedHay.includes(foldedQ);
  }
  return tokens.every((t) => orderSearchTokenMatchesHaystack(t, foldedHay));
}

/** Игла для Prisma `contains`, если вставили всю строку документооборота. */
export function orderSearchContainsNeedle(raw: string): string {
  return orderSearchPrismaNeedles(raw)[0] ?? "";
}

/**
 * Что искать в БД: при номере YYMM-NNN — только он
 * (хвост «Загоскина Я. Самус Н. Э.» и юрлицо из «скопировать все» не идут в contains).
 */
export function orderSearchPrismaNeedles(raw: string): string[] {
  const n = String(raw || "").trim();
  if (!n) return [];
  const num = extractOrderNumberFromSearchQuery(n);
  if (num) return [num];
  const tokens = orderSearchSignificantTokens(n);
  return tokens.length > 0 ? tokens : [n];
}
