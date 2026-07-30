import {
  DEFAULT_KANBAN_ADMIN_MENTION_TAG,
  normalizeKanbanAdminMentionTag,
} from "@/lib/kanban-admin-mention";

const CRM_COMMENT_AUTHOR_PREFIX_RE =
  /^\[CRM · ([^\]]+)\]\s*(?:\[DRAFT:([A-Za-z0-9_-]{6,120})\])?\s*(?:\r?\n)?/;
/** Если Kaiten/клиент разорвал маркеры на строки — [DRAFT] может остаться первой строкой тела. */
const CRM_DRAFT_ONLY_LINE_RE =
  /^\[DRAFT:([A-Za-z0-9_-]{6,120})\]\s*(?:\r?\n)?/;

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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MIXED_ALPHABET_MAP: Record<string, string> = {
  с: "c",
  С: "c",
  а: "a",
  А: "a",
  о: "o",
  О: "o",
  е: "e",
  Е: "e",
  р: "p",
  Р: "p",
  х: "x",
  Х: "x",
  в: "b",
  В: "b",
  м: "m",
  М: "m",
  н: "h",
  Н: "h",
  т: "t",
  Т: "t",
  к: "k",
  К: "k",
  у: "y",
  У: "y",
};

export function normalizeMixedAlphabetForMentionMatch(s: string): string {
  return s.replace(
    /[сСаАоОеЕрРхХвВмМнНтТкКуУ]/g,
    (m) => MIXED_ALPHABET_MAP[m] || m,
  );
}

/**
 * Упоминание «команды лаборатории» в чате Kaiten (подсветка «Чат» в списке нарядов).
 * `tagToken` — без `@`, как в настройках организации (Tenant.kanbanAdminMentionTag).
 * Учитывает HTML-сущности @, markdown, обычный HTML после strip.
 */
export function textIncludesAdminLabMention(raw: string, tagToken?: string | null): boolean {
  const tag = normalizeKanbanAdminMentionTag(tagToken);
  const esc = escapeRegExp(normalizeMixedAlphabetForMentionMatch(tag));
  const n = normalizeMixedAlphabetForMentionMatch(normalizeOrderKaitenChatTriggerSource(raw));
  if (new RegExp(`@${esc}(?![\\p{L}\\p{N}._-])`, "iu").test(n)) return true;
  const mdLoosen = n.replace(/\*+/g, " ").replace(/_+/g, " ");
  if (new RegExp(`@${esc}(?![\\p{L}\\p{N}._-])`, "iu").test(mdLoosen)) return true;
  return new RegExp(`@[\\s._-]{0,4}${esc}(?![\\p{L}\\p{N}._-])`, "iu").test(mdLoosen);
}

/** @deprecated Используйте textIncludesAdminLabMention(raw, DEFAULT_KANBAN_ADMIN_MENTION_TAG). */
export function textIncludesClicklabMention(raw: string): boolean {
  return textIncludesAdminLabMention(raw, DEFAULT_KANBAN_ADMIN_MENTION_TAG);
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

function sanitizeCrmDraftId(raw: string | null | undefined): string | null {
  const t = String(raw || "").trim();
  if (!t) return null;
  if (!/^[A-Za-z0-9_-]{6,120}$/.test(t)) return null;
  return t;
}

/**
 * Текст комментария от админов, уходящий в Kaiten из CRM: первая строка фиксирует автора в CRM,
 * т.к. в Kaiten автором будет пользователь API-токена, а не сотрудник из сессии.
 */
export function buildKaitenCommentTextWithCrmAuthor(
  label: string,
  body: string,
  crmDraftId?: string | null,
): string {
  const safe = sanitizeLabelForCrmKaitenComment(label);
  const draft = sanitizeCrmDraftId(crmDraftId);
  return draft ? `[CRM · ${safe}][DRAFT:${draft}]\n${body}` : `[CRM · ${safe}]\n${body}`;
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
  isCrm: boolean;
  crmDraftId?: string | null;
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
  const isCrm = !!m;
  let crmDraftId: string | null = null;
  if (m) {
    const crm = m[1]?.trim();
    if (crm) authorName = crm;
    crmDraftId = sanitizeCrmDraftId(m[2]);
    text = text.slice(m[0].length);
  }
  const draftOnly = text.match(CRM_DRAFT_ONLY_LINE_RE);
  if (draftOnly) {
    if (!crmDraftId) crmDraftId = sanitizeCrmDraftId(draftOnly[1]);
    text = text.slice(draftOnly[0].length);
  }

  const created =
    typeof r.created === "string"
      ? r.created
      : typeof r.created_at === "string"
        ? r.created_at
        : undefined;
  return { id, text, created, authorName, parentId, isCrm, crmDraftId };
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
