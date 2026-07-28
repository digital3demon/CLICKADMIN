import { PLAIN_TEXT_URL_RE, trimTrailingUrlPunctuation } from "@/lib/linkify-plain-text";

const MARKDOWN_IMAGE_RE =
  /!\[[^\]]*\]\((?:https?:\/\/[^\s)\]]+?\.(?:png|jpe?g|gif|webp|svg)(?:[^\s)\]]*)?|cid:[^\s)\]]+)\)/giu;
const BRACKET_IMAGE_RE =
  /\[(?:https?:\/\/[^\s\]]+?\.(?:png|jpe?g|gif|webp|svg)(?:[^\s\]]*)?|cid:[^\s\]]+)\]/giu;
const BRACKET_URL_RE = /\[(https?:\/\/[^\s\]]+)\]/giu;
const BRACKET_URL_ONLY_LINE_RE = /^\[(https?:\/\/[^\s\]]+)\]$/iu;

function normalizeMailUrl(url: string): string {
  return trimTrailingUrlPunctuation(url.trim()).href.toLowerCase();
}

/** Убирает `[https://…]`, если тот же URL уже есть в тексте без скобок (типично для писем с Яндекса). */
function stripDuplicateBracketUrls(text: string): string {
  const bareUrls = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (BRACKET_URL_ONLY_LINE_RE.test(trimmed)) continue;
    const withoutBracketUrls = line.replace(BRACKET_URL_RE, " ");
    for (const match of withoutBracketUrls.matchAll(PLAIN_TEXT_URL_RE)) {
      const href = match[0];
      if (href) bareUrls.add(normalizeMailUrl(href));
    }
  }
  if (bareUrls.size === 0) return text;

  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      const onlyBracket = trimmed.match(BRACKET_URL_ONLY_LINE_RE);
      if (onlyBracket?.[1] && bareUrls.has(normalizeMailUrl(onlyBracket[1]))) {
        return "";
      }
      return line.replace(BRACKET_URL_RE, (full, url: string) =>
        bareUrls.has(normalizeMailUrl(url)) ? "" : full,
      );
    })
    .join("\n");
}

/** Убирает `[https://…]`, если тот же URL уже есть в тексте без скобок (типично для писем с Яндекса). */
export function dedupeDuplicateBracketUrls(text: string | null | undefined): string {
  const raw = (text ?? "").replace(/\\\[/g, "[").replace(/\\\]/g, "]");
  return stripDuplicateBracketUrls(raw);
}

export function cleanMailTextBody(text: string | null | undefined): string {
  const deduped = dedupeDuplicateBracketUrls(
    (text ?? "").replace(MARKDOWN_IMAGE_RE, " "),
  );
  return deduped
    .split(/\r?\n/)
    .map((line) => {
      let next = line.replace(BRACKET_IMAGE_RE, " ");
      // Только шаблонные подписи к inline-картинкам писем (Яндекс и т.п.).
      // Не трогаем «картинка» / «изображение» — в заказах лаборатории это поля состава
      // («картинка 37,33»), а не alt-текст вложения. Границы через \p{L}: JS \b для кириллицы ненадёжен.
      next = next.replace(/(?<!\p{L})(?:логотип|logo|image)(?!\p{L})/giu, " ");
      return next.replace(/\s+/g, " ").trim();
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function decodeBasicHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => {
      const n = Number.parseInt(code, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    });
}

export function mailHtmlToText(html: string | null | undefined): string {
  const text = (html ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<(?:br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ");
  return cleanMailTextBody(decodeBasicHtmlEntities(text));
}
