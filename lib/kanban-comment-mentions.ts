/**
 * Парсинг @упоминаний в тексте чата канбана.
 * Токены должны совпадать с тем, что подставляет UI (см. KanbanCardModal ChatPanel):
 * mentionHandle, иначе локальная часть email, иначе displayName — все через тот же sanitize.
 * Используем /[^\s@]+/u — кириллица допустима; `\b` для кириллицы в JS ненадёжен.
 */
export type KanbanMentionLookupUser = {
  id: string;
  mentionHandle: string | null;
  email?: string | null;
  displayName?: string | null;
};

/** Как в ChatPanel: безопасный токен для @упоминания. */
export function sanitizeMentionToken(raw: string): string {
  return raw
    .replace(/^@+/, "")
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}._-]/gu, "")
    .trim();
}

function buildMentionTokenMap(
  users: readonly KanbanMentionLookupUser[],
): Map<string, string> {
  const tokenToId = new Map<string, string>();
  const tryAdd = (token: string, userId: string) => {
    const k = sanitizeMentionToken(token).toLowerCase();
    if (!k || tokenToId.has(k)) return;
    tokenToId.set(k, userId);
  };
  for (const u of users) {
    const h = u.mentionHandle?.trim();
    if (h) tryAdd(h, u.id);
  }
  for (const u of users) {
    const local = (u.email || "").split("@")[0]?.trim();
    if (local) tryAdd(local, u.id);
  }
  for (const u of users) {
    const dn = (u.displayName || "").trim();
    if (dn) tryAdd(dn, u.id);
  }
  return tokenToId;
}

export function parseMentionUserIdsFromText(
  text: string,
  users: readonly KanbanMentionLookupUser[],
): string[] {
  const tokenToId = buildMentionTokenMap(users);
  const re = /@([^\s@]+)/gu;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    const id = tokenToId.get(raw.toLowerCase());
    if (id) out.add(id);
  }
  return [...out];
}
