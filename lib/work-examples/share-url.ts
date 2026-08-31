/**
 * Публичная ссылка на пример: /w/{token}, без slug и длинного /p/t/…/w/.
 * Старый путь /p/t/{slug}/w/{token} остаётся рабочим.
 */
export const WORK_EXAMPLE_SHARE_TOKEN_BYTES = 6;

/** Старые токены ~24 символа; новые ~8. */
export function isLongWorkExampleShareToken(token: string): boolean {
  return String(token || "").trim().length > 12;
}

export function workExampleSharePath(token: string): string {
  const t = String(token || "").trim();
  return t ? `/w/${encodeURIComponent(t)}` : "";
}

export function workExampleShareUrl(base: string, token: string): string {
  const origin = String(base || "").replace(/\/+$/, "");
  const path = workExampleSharePath(token);
  if (!origin || !path) return "";
  return `${origin}${path}`;
}
