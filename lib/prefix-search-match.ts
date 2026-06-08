/** Токены для префиксного поиска: части названия после /, пробелов, тире. */
export function prefixSearchTokens(text: string): string[] {
  return String(text || "")
    .split(/[\s/|—–,\-]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function normalizePrefixQuery(query: string): string {
  return query.trim().toLocaleLowerCase("ru-RU");
}

/** Строка или любой её токен начинается с запроса (без учёта регистра). */
export function textMatchesPrefixQuery(text: string, query: string): boolean {
  const q = normalizePrefixQuery(query);
  if (!q) return true;
  const raw = String(text || "").trim();
  if (!raw) return false;
  const lower = (s: string) => s.toLocaleLowerCase("ru-RU");
  if (lower(raw).startsWith(q)) return true;
  for (const token of prefixSearchTokens(raw)) {
    if (lower(token).startsWith(q)) return true;
  }
  return false;
}

export type PrefixSearchOption = {
  label: string;
  searchPrefixes?: string[];
};

export function comboboxOptionMatchesPrefixQuery(
  option: PrefixSearchOption,
  query: string,
): boolean {
  if (textMatchesPrefixQuery(option.label, query)) return true;
  for (const prefix of option.searchPrefixes ?? []) {
    if (textMatchesPrefixQuery(prefix, query)) return true;
  }
  return false;
}

/**
 * Поиск в списках/таблицах: подстрока в поле или в любом фрагменте после /, пробела, тире.
 * «smi» находит «Смайл /Smile», как и префиксный комбобокс.
 */
export function textMatchesListQuery(text: string, query: string): boolean {
  const q = normalizePrefixQuery(query);
  if (!q) return true;
  const raw = String(text || "").trim();
  if (!raw) return false;
  const lower = (s: string) => s.toLocaleLowerCase("ru-RU");
  if (lower(raw).includes(q)) return true;
  for (const token of prefixSearchTokens(raw)) {
    if (lower(token).includes(q)) return true;
  }
  return false;
}

export function fieldsMatchListQuery(
  fields: Array<string | null | undefined>,
  query: string,
): boolean {
  const q = normalizePrefixQuery(query);
  if (!q) return true;
  for (const field of fields) {
    if (field && textMatchesListQuery(field, query)) return true;
  }
  return false;
}

/** Доп. префиксы для комбобокса: фрагменты после / и пробелов в подписи. */
export function comboboxSearchPrefixesFromText(
  ...parts: Array<string | null | undefined>
): string[] {
  const out = new Set<string>();
  for (const part of parts) {
    const raw = String(part || "").trim();
    if (!raw) continue;
    for (const token of prefixSearchTokens(raw)) {
      if (token) out.add(token);
    }
  }
  return [...out];
}
