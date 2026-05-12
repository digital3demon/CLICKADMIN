import type { UserRole } from "@prisma/client";
import type { KanbanCard } from "@/lib/kanban/types";
import { cardInvolvesUser } from "@/lib/kanban/model";

/** Кто может блокировать / разблокировать карточку в CRM-канбане (кроме участников и ответственных). */
const KANBAN_BLOCK_ADMIN_ROLES: ReadonlySet<UserRole> = new Set([
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
]);

export function isKanbanBlockAdministratorRole(
  role: UserRole | null | undefined,
): boolean {
  return role != null && KANBAN_BLOCK_ADMIN_ROLES.has(role);
}

/**
 * Блокировка и снятие блокировки в канбане: администратор или пользователь в ответственных / участниках карточки.
 */
export function canUserManageKanbanBlockForCard(
  sessionUserId: string | null | undefined,
  sessionUserRole: UserRole | null | undefined,
  card: KanbanCard,
): boolean {
  if (isKanbanBlockAdministratorRole(sessionUserRole)) return true;
  const uid = (sessionUserId || "").trim();
  if (!uid) return false;
  return cardInvolvesUser(card, uid);
}
