export type PlainTextLinkSegment =
  | { kind: "text"; value: string }
  | { kind: "link"; href: string; display: string };

/** http(s) в plain text; кириллица вокруг URL не входит в совпадение (нет \\b для кириллицы). */
export const PLAIN_TEXT_URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/giu;
const ANGLE_FILE_LINK_LINE_RE = /^(.+?)\s+<(https?:\/\/[^>]+)>\s*$/u;
const URL_ONLY_LINE_RE = /^(?:<(https?:\/\/[^>]+)>|(https?:\/\/\S+))$/iu;

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

/** «имя файла <url>» или «имя файла» + строка с url → markdown-ссылки для отображения. */
export function mergeFilenameUrlLines(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const angle = line.match(ANGLE_FILE_LINK_LINE_RE);
    if (angle?.[1] && angle[2]) {
      const label = angle[1].trim();
      const href = trimTrailingUrlPunctuation(angle[2].trim()).href;
      if (label && href) {
        out.push(`[${label}](${href})`);
        continue;
      }
    }

    const next = i + 1 < lines.length ? lines[i + 1]! : null;
    if (next != null) {
      const urlMatch = next.trim().match(URL_ONLY_LINE_RE);
      const rawUrl = urlMatch?.[1] ?? urlMatch?.[2];
      const label = line.trim();
      if (
        rawUrl &&
        label &&
        !/^https?:\/\//iu.test(label) &&
        !label.startsWith("[")
      ) {
        const href = trimTrailingUrlPunctuation(rawUrl).href;
        if (href) {
          out.push(`[${label}](${href})`);
          i++;
          continue;
        }
      }
    }

    out.push(line);
  }

  return out.join("\n");
}

function splitPlainTextLinksBare(text: string): PlainTextLinkSegment[] {
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

  return segments;
}

export function splitPlainTextLinks(text: string): PlainTextLinkSegment[] {
  if (!text) return [];

  const prepared = mergeFilenameUrlLines(text);
  const segments: PlainTextLinkSegment[] = [];
  let lastIndex = 0;

  for (const match of prepared.matchAll(MARKDOWN_LINK_RE)) {
    const raw = match[0];
    const index = match.index ?? 0;
    const display = match[1] ?? "";
    const rawHref = match[2] ?? "";
    if (!raw) continue;

    if (index > lastIndex) {
      segments.push(...splitPlainTextLinksBare(prepared.slice(lastIndex, index)));
    }

    const { href } = trimTrailingUrlPunctuation(rawHref);
    if (href) {
      segments.push({ kind: "link", href, display });
    } else {
      segments.push({ kind: "text", value: raw });
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < prepared.length) {
    segments.push(...splitPlainTextLinksBare(prepared.slice(lastIndex)));
  }

  return segments.length > 0 ? segments : [{ kind: "text", value: prepared }];
}
