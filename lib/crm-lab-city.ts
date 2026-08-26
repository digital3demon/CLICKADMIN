/**
 * Город лаборатории CRM (по умолчанию СПб) ↔ адрес клиники в списке нарядов.
 * Явный чужой город («г. Москва») — не свой (янтарь в списке); улица без города — местная.
 * Границы токенов без \b: кириллица для JS не «словесные» буквы.
 */

const DEFAULT_LAB_CITY_ALIASES = [
  "санкт-петербург",
  "санкт петербург",
  "спб",
  "питер",
  "петербург",
  "ленинград",
  "spb",
  "petersburg",
] as const;

/** Районы / города федерального значения в составе СПб. */
const DEFAULT_LAB_CITY_DISTRICTS = [
  "колпино",
  "пушкин",
  "петергоф",
  "петродворец",
  "кронштадт",
  "павловск",
  "сестрорецк",
  "ломоносов",
  "зеленогорск",
  "красное село",
  "парголово",
  "шушары",
  "стрельна",
] as const;

const OTHER_CITY_TOKENS = [
  "москва",
  "мск",
  "казань",
  "екатеринбург",
  "новосибирск",
  "краснодар",
  "минск",
  "алматы",
  "ленинградская область",
  "московская область",
] as const;

function foldCityText(raw: string): string {
  return String(raw ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

function containsCityToken(haystack: string, needle: string): boolean {
  const n = foldCityText(needle);
  if (!n) return false;
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const re = new RegExp(`(?:^|[^\\p{L}])${escaped}(?:[^\\p{L}]|$)`, "u");
  return re.test(haystack);
}

export function isClinicAddressInCrmCity(
  address: string | null | undefined,
  labCityAliases: readonly string[] = DEFAULT_LAB_CITY_ALIASES,
): boolean {
  const raw = String(address ?? "").trim();
  if (!raw) return false;
  const text = foldCityText(raw);
  const lab = [...labCityAliases, ...DEFAULT_LAB_CITY_DISTRICTS].map(foldCityText);

  for (const alias of lab) {
    if (containsCityToken(text, alias)) return true;
  }

  for (const other of OTHER_CITY_TOKENS) {
    if (containsCityToken(text, other)) return false;
  }

  const cityRe = /(?:^|[^\p{L}])г(?:ород)?\.?\s+([\p{L}-]+)/gu;
  let m: RegExpExecArray | null;
  while ((m = cityRe.exec(text)) != null) {
    const name = foldCityText(m[1] ?? "");
    if (!name) continue;
    const isLab = lab.some(
      (a) => a === name || a.startsWith(`${name} `) || name.startsWith(a),
    );
    if (!isLab) return false;
  }

  return true;
}

const ADDRESS_MUTED_CLASS = "text-[var(--text-secondary)]";
const ADDRESS_OUT_OF_CITY_CLASS = "font-bold text-amber-700 dark:text-amber-400";

/** Жирный янтарь — другой город; СПб / улица без города — обычный цвет. */
export function crmCityAddressTextClass(
  address: string | null | undefined,
): string {
  const raw = String(address ?? "").trim();
  if (!raw) return ADDRESS_MUTED_CLASS;
  return isClinicAddressInCrmCity(raw)
    ? ADDRESS_MUTED_CLASS
    : ADDRESS_OUT_OF_CITY_CLASS;
}
