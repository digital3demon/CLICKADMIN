function decodeBasicHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripRemainingTags(html: string): string {
  return decodeBasicHtmlEntities(html.replace(/<[^>]+>/g, ""));
}

/** HTML тела ответа → текст для редактирования (абзацы через пустую строку). */
export function htmlReplyBodyToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/div>\s*<div[^>]*>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "\n\n")
    .replace(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi, (_, alt: string) =>
      alt.trim() ? `[${alt.trim()}]\n` : "",
    )
    .replace(/<img[^>]*>/gi, "");

  return stripRemainingTags(withBreaks)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Текст из preflight → простой HTML для письма. */
export function plainTextToReplyHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";
  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return "";
  return paragraphs
    .map((paragraph) => {
      const inner = escapeHtmlText(paragraph).replace(/\n/g, "<br>");
      return `<p>${inner}</p>`;
    })
    .join("");
}

const IMG_TAG_RE = /<img\b[^>]*>/gi;

export function extractInlineImagesFromReplyHtml(html: string): string[] {
  return html.match(IMG_TAG_RE) ?? [];
}

/** Сохраняет inline-картинки из шаблона, подставляет отредактированный текст. */
export function mergeReplyHtmlWithImages(imageTags: string[], bodyHtml: string): string {
  const images = imageTags.join("");
  const body = bodyHtml.trim();
  if (!images) return body;
  if (!body) return images;
  return `${images}${body}`;
}
