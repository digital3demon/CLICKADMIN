/**
 * Разбор темы письма: «Марко Росса Джалилов М.» → работа + пациент.
 * Порядок слов в теме часто: {тип работы из прайса} {фамилия пациента} {инициал}.
 */

export type SubjectWorkPatientSplit = {
  patientName: string | null;
  workNameHints: string[];
};

function tokenizeForMatch(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\\/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function prefixMatchesPriceName(prefix: string, priceName: string): boolean {
  const prefixTokens = tokenizeForMatch(prefix);
  if (prefixTokens.length === 0) return false;
  const nameTokens = new Set(tokenizeForMatch(priceName));
  return prefixTokens.every((token) => nameTokens.has(token));
}

export function splitSubjectWorkAndPatient(
  subject: string | null | undefined,
  priceListNames: string[],
): SubjectWorkPatientSplit {
  const trimmed = subject?.trim() ?? "";
  if (!trimmed || priceListNames.length === 0) {
    return { patientName: null, workNameHints: [] };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  for (let prefixLen = words.length - 1; prefixLen >= 1; prefixLen--) {
    const prefix = words.slice(0, prefixLen).join(" ");
    if (prefix.length < 4) continue;

    const matches = priceListNames.filter((name) => prefixMatchesPriceName(prefix, name));
    if (matches.length !== 1) continue;

    const rest = words.slice(prefixLen).join(" ").trim();
    return {
      patientName: rest.length >= 2 ? rest : null,
      workNameHints: [matches[0]!],
    };
  }

  return { patientName: null, workNameHints: [] };
}

/** Убрать из patientName фрагменты, совпадающие с названиями работ из прайса. */
export function stripWorkNamesFromPatientName(
  patientName: string | null | undefined,
  priceListNames: string[],
): string | null {
  const trimmed = patientName?.trim() ?? "";
  if (!trimmed) return null;

  const split = splitSubjectWorkAndPatient(trimmed, priceListNames);
  if (split.patientName) return split.patientName;
  if (split.workNameHints.length > 0) return null;
  return trimmed;
}

/** «Пациент: …» в теле письма — без отдельного LLM-запроса. */
export function parsePatientNameFromEmailBody(text: string | null | undefined): string | null {
  const body = text?.trim() ?? "";
  if (!body) return null;
  const match = body.match(/(?:^|\n)\s*Пациент\s*:\s*([^\n]+)/iu);
  const raw = match?.[1]?.trim();
  return raw && raw.length > 1 ? raw : null;
}
