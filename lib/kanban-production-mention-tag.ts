import { sanitizeMentionToken } from "@/lib/kanban-comment-mentions";

/** Дефолтный токен @упоминания группы «Производство» (настраивается на доске). */
export const DEFAULT_PRODUCTION_MENTION_TAG = "clickpr";

export function normalizeProductionMentionTag(raw: string | null | undefined): string {
  const t = sanitizeMentionToken((raw ?? "").trim());
  if (t.length >= 2 && t.length <= 32) return t.toLowerCase();
  return DEFAULT_PRODUCTION_MENTION_TAG;
}
