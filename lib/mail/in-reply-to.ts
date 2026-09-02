/** Нормализация Message-ID и разбор In-Reply-To / References. */

export function normalizeMailMessageId(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.startsWith("<") && t.endsWith(">")) return t;
  return `<${t}>`;
}

function parseMessageIdHeaderValue(s: string): string[] {
  const angled = [...s.matchAll(/<[^>]+>/g)].map((m) => m[0]);
  if (angled.length > 0) {
    return [...new Set(angled.map((id) => normalizeMailMessageId(id)))].filter(
      Boolean,
    );
  }
  return [
    ...new Set(s.split(/\s+/).map(normalizeMailMessageId).filter(Boolean)),
  ];
}

function readHeaderField(
  rawHeaders: unknown,
  field: "in-reply-to" | "references",
): string {
  if (!rawHeaders || typeof rawHeaders !== "object") return "";
  const rec = rawHeaders as Record<string, unknown>;
  for (const [key, value] of Object.entries(rec)) {
    if (key.toLowerCase() === field && typeof value === "string") return value;
  }
  return "";
}

/** Варианты messageId для поиска в БД (`<id>` и `id`). */
export function mailMessageIdLookupVariants(ids: string[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    const n = normalizeMailMessageId(id);
    if (!n) continue;
    const bare = n.replace(/^<|>$/g, "");
    out.push(n, bare);
  }
  return [...new Set(out)];
}

/** Только In-Reply-To (непосредственный родитель). */
export function extractInReplyToMessageIds(rawHeaders: unknown): string[] {
  return parseMessageIdHeaderValue(readHeaderField(rawHeaders, "in-reply-to"));
}

export function extractReplyParentMessageIds(rawHeaders: unknown): string[] {
  const inReplyTo = readHeaderField(rawHeaders, "in-reply-to");
  const references = readHeaderField(rawHeaders, "references");
  return parseMessageIdHeaderValue(`${inReplyTo} ${references}`);
}

/**
 * Message-ID родителей для автопривязки к наряду:
 * сначала In-Reply-To; если пусто — последний id из References (часто ближайший родитель).
 * Не тащим всю цепочку References — иначе ответ на автоответ цепляется к исходному письму заказа.
 */
export function extractDocumentThreadParentMessageIds(
  rawHeaders: unknown,
): string[] {
  const inReplyTo = extractInReplyToMessageIds(rawHeaders);
  if (inReplyTo.length > 0) return inReplyTo;
  const refs = parseMessageIdHeaderValue(
    readHeaderField(rawHeaders, "references"),
  );
  if (refs.length === 0) return [];
  return [refs[refs.length - 1]!];
}
