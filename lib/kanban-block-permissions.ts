import type { UserRole } from "@prisma/client";
import type { KanbanCard } from "@/lib/kanban/types";
import { cardInvolvesUser } from "@/lib/kanban/model";

const KANBAN_BLOCK_COORDINATOR_ROLES: ReadonlySet<UserRole> = new Set([
  "OWNER",
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
  "SENIOR_TECHNICIAN",
  "MANAGER",
]);

export function isKanbanBlockAdministratorRole(
  role: UserRole | null | undefined,
): boolean {
  return role != null && KANBAN_BLOCK_COORDINATOR_ROLES.has(role);
}

/**
 * Блокировка карточки: модуль KANBAN_MANAGE_BLOCK + координатор или участник карточки.
 */
export function canUserManageKanbanBlockForCard(
  sessionUserId: string | null | undefined,
  sessionUserRole: UserRole | null | undefined,
  card: KanbanCard,
  moduleAccess?: Partial<Record<string, boolean>> | null,
): boolean {
  if (moduleAccess?.KANBAN_MANAGE_BLOCK !== true) return false;
  if (isKanbanBlockAdministratorRole(sessionUserRole)) return true;
  const uid = (sessionUserId || "").trim();
  if (!uid) return false;
  return cardInvolvesUser(card, uid);
}
