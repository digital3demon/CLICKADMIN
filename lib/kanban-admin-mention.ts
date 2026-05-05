import type { UserRole } from "@prisma/client";
import { sanitizeMentionToken } from "@/lib/kanban-comment-mentions";

/** Тег по умолчанию для @упоминания админской группы в чате. */
export const DEFAULT_KANBAN_ADMIN_MENTION_TAG = "clicklab";

/** Роли, которые в канбане не показываются по отдельности — только общий тег (см. Tenant.kanbanAdminMentionTag). */
export const KANBAN_ADMIN_GROUP_ROLES: ReadonlySet<UserRole> = new Set([
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
]);

export function isKanbanAdminGroupRole(role: UserRole | string | undefined | null): boolean {
  if (role == null || role === "") return false;
  return KANBAN_ADMIN_GROUP_ROLES.has(role as UserRole);
}

/**
 * Нормализует тег для подстановки и поиска в тексте (строчные латиница/цифры/`_`/`-`/`.`).
 * Невалидное значение → дефолт.
 */
export function normalizeKanbanAdminMentionTag(raw: string | null | undefined): string {
  const t = sanitizeMentionToken((raw ?? "").trim());
  if (t.length >= 2 && t.length <= 32) return t.toLowerCase();
  return DEFAULT_KANBAN_ADMIN_MENTION_TAG;
}
