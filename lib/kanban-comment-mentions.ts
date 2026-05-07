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

export type ParseMentionUserIdsOptions = {
  /** Токен без @ (нормализованный), общий для ADMINISTRATOR + SENIOR_ADMINISTRATOR. */
  adminMentionTag?: string;
  adminUserIds?: readonly string[];
  /** Токен группы «Производство» (настройка доски), все пользователи с ролью PRODUCTION. */
  productionMentionTag?: string;
  productionUserIds?: readonly string[];
};

function escapeRegExpChars(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Есть ли в тексте @token как отдельное упоминание (границы после токена). */
export function textIncludesMentionToken(text: string, token: string): boolean {
  const t = sanitizeMentionToken(token).toLowerCase();
  if (!t) return false;
  const re = new RegExp(`@(${escapeRegExpChars(t)})(?=$|[^\\p{L}\\p{N}_])`, "giu");
  return re.test(text);
}

export function parseMentionUserIdsFromText(
  text: string,
  users: readonly KanbanMentionLookupUser[],
  opts?: ParseMentionUserIdsOptions,
): string[] {
  const tokenToId = buildMentionTokenMap(users);
  const adminTag = opts?.adminMentionTag
    ? sanitizeMentionToken(opts.adminMentionTag).toLowerCase()
    : "";
  const adminIds = opts?.adminUserIds?.length
    ? [...new Set(opts.adminUserIds.filter(Boolean))]
    : [];
  const prodTag = opts?.productionMentionTag
    ? sanitizeMentionToken(opts.productionMentionTag).toLowerCase()
    : "";
  const prodIds = opts?.productionUserIds?.length
    ? [...new Set(opts.productionUserIds.filter(Boolean))]
    : [];
  const re = /@([^\s@]+)/gu;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    const key = sanitizeMentionToken(raw).toLowerCase();
    if (adminTag && key === adminTag) {
      for (const id of adminIds) out.add(id);
      continue;
    }
    if (prodTag && key === prodTag) {
      for (const id of prodIds) out.add(id);
      continue;
    }
    const id = tokenToId.get(key);
    if (id) out.add(id);
  }
  return [...out];
}
