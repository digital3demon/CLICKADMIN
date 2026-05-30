export function textFromHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function previewFrom(text: string | undefined): string | null {
  const normalized = (text ?? "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\((?:https?:\/\/|cid:)[^)]*\)/gi, "$1")
    .replace(/\[(?:https?:\/\/|cid:)[^\]]+]/gi, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    // JS \b не считает кириллицу word-символами, поэтому границы задаём через \p{L}.
    .replace(/(?<!\p{L})(?:логотип|logo)(?!\p{L})/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized ? normalized.slice(0, 320) : null;
}

export function previewFromText(text: string, max = 320): string | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, max) : null;
}

/** Текстовая часть + fallback из HTML — многие письма с Яндекса приходят только с htmlBody. */
export function previewFromMailBody(
  text: string | null | undefined,
  html: string | null | undefined,
): string | null {
  const fromText = previewFrom(text ?? undefined);
  if (fromText) return fromText;
  if (typeof html === "string" && html.trim()) {
    return previewFrom(textFromHtml(html));
  }
  return null;
}
