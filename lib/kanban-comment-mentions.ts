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

export type ChatMentionDraft = { start: number; end: number; query: string };

/**
 * Черновик @упоминания у каретки (выпадающий список в чате).
 * Граница до @: не `\b` — кириллица иначе ломает «Всеволод@» и ловит «Всеволод @ро».
 */
export function findMentionDraft(text: string, caretPos: number): ChatMentionDraft | null {
  const caret = Math.max(0, Math.min(caretPos, text.length));
  const before = text.slice(0, caret);
  const atPos = before.lastIndexOf("@");
  if (atPos < 0) return null;
  if (atPos > 0 && /[\p{L}\p{N}_]/u.test(before[atPos - 1] ?? "")) {
    return null;
  }
  const token = before.slice(atPos + 1);
  if (/\s/.test(token)) return null;
  return { start: atPos, end: caret, query: token.toLowerCase() };
}

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
  /** Токен группы «Производство» (настройка доски), все пользователи с ролью PRODUCTION/SENIOR_PRODUCTION. */
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
  
  // Нормализуем кириллицу/латиницу для надежного матчинга
  const map: Record<string, string> = {
    с: "c", С: "c", а: "a", А: "a", о: "o", О: "o", е: "e", Е: "e",
    р: "p", Р: "p", х: "x", Х: "x", в: "b", В: "b", м: "m", М: "m",
    н: "h", Н: "h", т: "t", Т: "t", к: "k", К: "k", у: "y", У: "y",
  };
  const normalize = (s: string) => s.replace(/[сСаАоОеЕрРхХвВмМнНтТкКуУ]/g, (char) => map[char] || char);
  
  const normalizedToken = normalize(t);
  const normalizedText = normalize(text);

  const re = new RegExp(`@(${escapeRegExpChars(normalizedToken)})(?=$|[^\\p{L}\\p{N}_])`, "giu");
  return re.test(normalizedText);
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
    
    // Нормализуем кириллицу/латиницу для надежного матчинга тегов (СlickLab -> clicklab)
    const normalizedRaw = raw.replace(/[сСаАоОеЕрРхХвВмМнНтТкКуУ]/g, (char) => {
      const map: Record<string, string> = {
        с: "c", С: "c", а: "a", А: "a", о: "o", О: "o", е: "e", Е: "e",
        р: "p", Р: "p", х: "x", Х: "x", в: "b", В: "b", м: "m", М: "m",
        н: "h", Н: "h", т: "t", Т: "t", к: "k", К: "k", у: "y", У: "y",
      };
      return map[char] || char;
    });

    const key = sanitizeMentionToken(normalizedRaw).toLowerCase();
    
    // Для админского и продакшн тегов тоже применяем ту же нормализацию
    const normalizedAdminTag = adminTag.replace(/[сСаАоОеЕрРхХвВмМнНтТкКуУ]/g, (char) => {
      const map: Record<string, string> = {
        с: "c", С: "c", а: "a", А: "a", о: "o", О: "o", е: "e", Е: "e",
        р: "p", Р: "p", х: "x", Х: "x", в: "b", В: "b", м: "m", М: "m",
        н: "h", Н: "h", т: "t", Т: "t", к: "k", К: "k", у: "y", У: "y",
      };
      return map[char] || char;
    });
    const normalizedProdTag = prodTag.replace(/[сСаАоОеЕрРхХвВмМнНтТкКуУ]/g, (char) => {
      const map: Record<string, string> = {
        с: "c", С: "c", а: "a", А: "a", о: "o", О: "o", е: "e", Е: "e",
        р: "p", Р: "p", х: "x", Х: "x", в: "b", В: "b", м: "m", М: "m",
        н: "h", Н: "h", т: "t", Т: "t", к: "k", К: "k", у: "y", У: "y",
      };
      return map[char] || char;
    });

    if (normalizedAdminTag && key === normalizedAdminTag) {
      for (const id of adminIds) out.add(id);
      continue;
    }
    if (normalizedProdTag && key === normalizedProdTag) {
      for (const id of prodIds) out.add(id);
      continue;
    }
    
    // Для обычных юзеров используем оригинальный ключ (без нормализации алфавита)
    const originalKey = sanitizeMentionToken(raw).toLowerCase();
    const id = tokenToId.get(originalKey);
    if (id) out.add(id);
  }
  return [...out];
}
