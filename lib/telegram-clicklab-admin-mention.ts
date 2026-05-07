/**
 * Фиксированное упоминание администратора лаборатории в группах Telegram (захват в CRM).
 * Поиск по подстроке — без `\b`, чтобы кириллица до/после не ломала совпадение.
 */
export const CLICKLAB_ADMIN_MENTION = "@clicklab_admin";

export function textIncludesClicklabAdminMention(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes(CLICKLAB_ADMIN_MENTION.toLowerCase());
}

/** Делит текст на части до и после первого вхождения @clicklab_admin (регистронезависимо). */
export function splitAroundClicklabAdmin(text: string): {
  before: string;
  after: string;
} | null {
  const lower = text.toLowerCase();
  const needle = CLICKLAB_ADMIN_MENTION.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx < 0) return null;
  return {
    before: text.slice(0, idx),
    after: text.slice(idx + CLICKLAB_ADMIN_MENTION.length),
  };
}
