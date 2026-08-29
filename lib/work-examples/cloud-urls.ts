/**
 * Несколько ссылок на облако в одном TEXT `cloudUrl`.
 * Канон в БД: URL через \\n. Пустые строки не пишем.
 * URL ищем без \\b — кириллица вокруг «https://…» не должна ломать разбор.
 */

export const WORK_EXAMPLE_CLOUD_URL_MAX = 12;
export const WORK_EXAMPLE_CLOUD_URL_ONE_MAX = 2000;
export const WORK_EXAMPLE_CLOUD_URL_TOTAL_MAX = 8000;

const HTTP_URL_RE = /https?:\/\/[^\s<>"'\\]+/giu;

function trimUrlTrail(raw: string): string {
  return raw.replace(/[.,;:!?)\]]+$/u, "");
}

export function parseWorkExampleCloudUrls(raw: unknown): string[] {
  const text = String(raw ?? "");
  const out: string[] = [];
  const seen = new Set<string>();
  const re = new RegExp(HTTP_URL_RE.source, HTTP_URL_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const url = trimUrlTrail(m[0]).slice(0, WORK_EXAMPLE_CLOUD_URL_ONE_MAX);
    if (url.length < 10 || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= WORK_EXAMPLE_CLOUD_URL_MAX) break;
  }
  return out;
}

export function serializeWorkExampleCloudUrls(urls: unknown): string {
  const parsed = Array.isArray(urls)
    ? parseWorkExampleCloudUrls(urls.join("\n"))
    : parseWorkExampleCloudUrls(urls);
  return parsed.join("\n").slice(0, WORK_EXAMPLE_CLOUD_URL_TOTAL_MAX);
}

/** Пока печатают одну ссылку — не режем. Несколько URL или перевод строки — раскладываем. */
export function splitWorkExampleCloudUrlDraft(raw: string): string[] | null {
  const text = String(raw ?? "");
  if (!text.includes("\n") && parseWorkExampleCloudUrls(text).length < 2) {
    return null;
  }
  const found = parseWorkExampleCloudUrls(text);
  if (text.endsWith("\n") && found.length < WORK_EXAMPLE_CLOUD_URL_MAX) {
    return [...found, ""];
  }
  return found.length ? found : [""];
}
