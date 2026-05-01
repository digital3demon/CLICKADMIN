/**
 * Парсинг @упоминаний в чате канбана по `mentionHandle` пользователей CRM.
 * Используем /[^\s@]+/u — кириллица в handle допустима; `\b` для кириллицы в JS ненадёжен.
 */
export function parseMentionUserIdsFromText(
  text: string,
  users: readonly { id: string; mentionHandle: string | null }[],
): string[] {
  const byLower = new Map<string, string>();
  for (const u of users) {
    const h = u.mentionHandle?.trim();
    if (h) byLower.set(h.toLowerCase(), u.id);
  }
  const re = /@([^\s@]+)/gu;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    const id = byLower.get(raw.toLowerCase());
    if (id) out.add(id);
  }
  return [...out];
}
