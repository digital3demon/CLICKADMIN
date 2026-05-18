const MARKDOWN_IMAGE_RE =
  /!\[[^\]]*\]\((?:https?:\/\/[^\s)\]]+?\.(?:png|jpe?g|gif|webp|svg)(?:[^\s)\]]*)?|cid:[^\s)\]]+)\)/giu;
const BRACKET_IMAGE_RE =
  /\[(?:https?:\/\/[^\s\]]+?\.(?:png|jpe?g|gif|webp|svg)(?:[^\s\]]*)?|cid:[^\s\]]+)\]/giu;

export function cleanMailTextBody(text: string | null | undefined): string {
  return (text ?? "")
    .replace(MARKDOWN_IMAGE_RE, " ")
    .split(/\r?\n/)
    .map((line) => {
      let next = line.replace(BRACKET_IMAGE_RE, " ");
      // JS \b не считает кириллицу word-символами, поэтому границы задаём через \p{L}.
      next = next.replace(/(?<!\p{L})(?:логотип|logo|image|изображение|картинка)(?!\p{L})/giu, " ");
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
