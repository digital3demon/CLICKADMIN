const CRM_COMMENT_AUTHOR_PREFIX_RE = /^\[CRM · (.+?)\]\s*\n/;

/** id комментария в ответах Kaiten REST часто приходит строкой (JSON). */
export function kaitenJsonIntId(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.trunc(v);
  }
  if (typeof v === "bigint") {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (/^-?\d+$/.test(t)) {
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

/** BOM / zero-width, переносы и простой HTML из Kaiten — чтобы «!!!» / «???» находились в теле. */
export function normalizeOrderKaitenChatTriggerSource(raw: string): string {
  let s = raw
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\u2060]/g, "")
    .replace(/\r\n/g, "\n");
  s = s
    .replace(/&ast;/gi, "*")
    .replace(/&#42;/g, "*")
    .replace(/&#x2a;/gi, "*");
  s = s
    .replace(/&quest;/gi, "?")
    .replace(/&#63;/g, "?")
    .replace(/&#x3f;/gi, "?");
  s = s
    .replace(/&commat;/gi, "@")
    .replace(/&#64;/g, "@")
    .replace(/&#x40;/gi, "@");
  s = s.replace(/\uFF20/g, "@");
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/&#xa0;/gi, " ");
  s = s
    .replace(/\u2217/g, "*")
    .replace(/\uFF0A/g, "*")
    .replace(/\u204E/g, "*")
    .replace(/\uFE61/g, "*");
  s = s.replace(/\uFF1F/g, "?");
  s = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  return s;
}

/**
 * Упоминание лаборатории в чате Kaiten (подсветка «Чат» в списке нарядов).
 * Учитывает HTML-сущности @, markdown (**@clicklab**), обычный HTML после strip.
 */
export function textIncludesClicklabMention(raw: string): boolean {
  const n = normalizeOrderKaitenChatTriggerSource(raw);
  if (/@clicklab\b/i.test(n)) return true;
  const mdLoosen = n.replace(/\*+/g, " ").replace(/_+/g, " ");
  if (/@clicklab\b/i.test(mdLoosen)) return true;
  return /@[\s._-]{0,4}clicklab\b/i.test(mdLoosen);
}

/** Первая непустая строка, начинающаяся с `prefix` (корректировки «!!!», протетика «???»). */
export function firstOrderChatTriggerLine(
  raw: string,
  prefix: string,
): string | null {
  const n = normalizeOrderKaitenChatTriggerSource(raw);
  for (const line of n.split("\n")) {
    const t = line.trim();
    if (t.startsWith(prefix)) return t;
  }
  return null;
}

/**
 * Текст для CRM после «!!!» / «???»: все строки сообщения, префикс убирается только
 * с той строки, где он стоит (после trim); строки до и после сохраняются.
 */
export function stripOrderChatTriggerPrefixKeepFullMessage(
  raw: string,
  prefix: string,
): string | null {
  if (!prefix.length) return null;
  const n = normalizeOrderKaitenChatTriggerSource(raw);
  const lines = n.split("\n");
  let triggerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.trim().startsWith(prefix)) {
      triggerIdx = i;
      break;
    }
  }
  if (triggerIdx < 0) return null;

  const t = lines[triggerIdx]!.trim();
  if (!t.startsWith(prefix)) return null;
  const firstLineBody = t.slice(prefix.length).trim();

  const out: string[] = [];
  for (let j = 0; j < lines.length; j++) {
    if (j < triggerIdx) {
      out.push(lines[j]!);
    } else if (j === triggerIdx) {
      if (firstLineBody.length) out.push(firstLineBody);
    } else {
      out.push(lines[j]!);
    }
  }
  const joined = out.join("\n").trim();
  return joined.length > 0 ? joined : null;
}

/** Подпись в первой строке: без `]` и переносов, чтобы не ломать разбор. */
export function sanitizeLabelForCrmKaitenComment(raw: string): string {
  const t = raw
    .replace(/\r?\n/g, " ")
    .replace(/\]/g, "›")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return t.length ? t : "CRM";
}

/**
 * Комментарий, уходящий в Kaiten из CRM: первая строка фиксирует автора в CRM,
 * т.к. в Kaiten автором будет пользователь API-токена, а не сотрудник из сессии.
 */
export function buildKaitenCommentTextWithCrmAuthor(label: string, body: string): string {
  const safe = sanitizeLabelForCrmKaitenComment(label);
  return `[CRM · ${safe}]\n${body}`;
}

function authorNameFromKaitenRecord(r: Record<string, unknown>): string | undefined {
  const top =
    typeof r.author_name === "string"
      ? r.author_name
      : typeof r.authorName === "string"
        ? r.authorName
        : typeof r.full_name === "string"
          ? r.full_name
          : undefined;
  const t = top?.trim();
  if (t) return t;

  const from = (u: unknown): string | undefined => {
    if (u == null || typeof u !== "object") return undefined;
    const o = u as Record<string, unknown>;
    if (typeof o.full_name === "string" && o.full_name.trim()) return o.full_name.trim();
    if (typeof o.username === "string" && o.username.trim()) return o.username.trim();
    if (typeof o.name === "string" && o.name.trim()) return o.name.trim();
    if (typeof o.email === "string" && o.email.includes("@")) {
      const local = o.email.split("@")[0]?.trim();
      if (local) return local;
    }
    return undefined;
  };

  return (
    from(r.author) ??
    from(r.user) ??
    from(r.member) ??
    from(r.created_by) ??
    from(r.owner) ??
    from(r.author_user)
  );
}

function stringFromNestedCommentField(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null || typeof v !== "object" || Array.isArray(v)) return "";
  const o = v as Record<string, unknown>;
  for (const k of ["text", "html", "markdown", "content", "body"] as const) {
    const inner = o[k];
    if (typeof inner === "string" && inner.trim()) return inner;
  }
  return "";
}

function kaitenCommentBodyText(r: Record<string, unknown>): string {
  for (const k of [
    "text",
    "comment",
    "body",
    "message",
    "content",
    "markdown",
    "description",
  ] as const) {
    const v = r[k];
    if (typeof v === "string" && v.length) return v;
    const nested = stringFromNestedCommentField(v);
    if (nested) return nested;
  }
  return "";
}

/** Одна строка комментария из Kaiten REST (список комментариев карточки). */
export function parseKaitenListComment(o: unknown): {
  id: number;
  text: string;
  created?: string;
  authorName?: string;
  parentId: number | null;
} | null {
  if (o == null || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const id = kaitenJsonIntId(r.id);
  if (id == null) return null;
  let text = kaitenCommentBodyText(r);
  const parentRaw = r.parent_comment_id ?? r.parent_id;
  const parentId = kaitenJsonIntId(parentRaw);
  let authorName = authorNameFromKaitenRecord(r);

  const m = text.match(CRM_COMMENT_AUTHOR_PREFIX_RE);
  if (m) {
    const crm = m[1]?.trim();
    if (crm) authorName = crm;
    text = text.slice(m[0].length);
  }

  const created =
    typeof r.created === "string"
      ? r.created
      : typeof r.created_at === "string"
        ? r.created_at
        : undefined;
  return { id, text, created, authorName, parentId };
}

/** Kaiten иногда отдаёт один и тот же id дважды — убираем дубли по числовому id. */
export function dedupeParsedKaitenComments<
  T extends { id: number; text?: string },
>(rows: readonly T[]): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const row of rows) {
    if (!Number.isFinite(row.id) || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}
