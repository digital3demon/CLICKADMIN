/** Нормализация Message-ID и разбор In-Reply-To / References. */

export function normalizeMailMessageId(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.startsWith("<") && t.endsWith(">")) return t;
  return `<${t}>`;
}

export function extractReplyParentMessageIds(rawHeaders: unknown): string[] {
  if (!rawHeaders || typeof rawHeaders !== "object") return [];
  const rec = rawHeaders as Record<string, unknown>;
  let inReplyTo = "";
  let references = "";
  for (const [key, value] of Object.entries(rec)) {
    const k = key.toLowerCase();
    const s = typeof value === "string" ? value : "";
    if (k === "in-reply-to") inReplyTo = s;
    if (k === "references") references = s;
  }
  const blob = `${inReplyTo} ${references}`;
  const angled = [...blob.matchAll(/<[^>]+>/g)].map((m) => m[0]);
  if (angled.length > 0) {
    return [...new Set(angled.map((id) => normalizeMailMessageId(id)))].filter(
      Boolean,
    );
  }
  return [...new Set(blob.split(/\s+/).map(normalizeMailMessageId).filter(Boolean))];
}
