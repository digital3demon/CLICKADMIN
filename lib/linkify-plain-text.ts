export type PlainTextLinkSegment =
  | { kind: "text"; value: string }
  | { kind: "link"; href: string; display: string };

/** http(s) в plain text; кириллица вокруг URL не входит в совпадение (нет \\b для кириллицы). */
export const PLAIN_TEXT_URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

const TRAILING_URL_PUNCTUATION_RE = /[.,;:!?)]+$/;

export function trimTrailingUrlPunctuation(url: string): {
  href: string;
  trailing: string;
} {
  const trailingMatch = url.match(TRAILING_URL_PUNCTUATION_RE);
  if (!trailingMatch) return { href: url, trailing: "" };
  const trailing = trailingMatch[0] ?? "";
  return { href: url.slice(0, url.length - trailing.length), trailing };
}

export function splitPlainTextLinks(text: string): PlainTextLinkSegment[] {
  if (!text) return [];

  const segments: PlainTextLinkSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(PLAIN_TEXT_URL_RE)) {
    const rawUrl = match[0];
    const index = match.index ?? 0;
    if (!rawUrl) continue;

    if (index > lastIndex) {
      segments.push({ kind: "text", value: text.slice(lastIndex, index) });
    }

    const { href, trailing } = trimTrailingUrlPunctuation(rawUrl);
    if (href) {
      segments.push({ kind: "link", href, display: href });
    } else {
      segments.push({ kind: "text", value: rawUrl });
    }
    if (trailing) {
      segments.push({ kind: "text", value: trailing });
    }

    lastIndex = index + rawUrl.length;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ kind: "text", value: text }];
}
