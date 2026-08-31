import type { UserRole } from "@prisma/client";

/** Старшие: снимают чужой таймер без участия в карточке. */
const KANBAN_TIMER_SENIOR_ROLES: ReadonlySet<UserRole> = new Set([
  "OWNER",
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
  "SENIOR_TECHNICIAN",
  "MANAGER",
]);

export function isKanbanTimerSeniorRole(
  role: UserRole | null | undefined,
): boolean {
  return role != null && KANBAN_TIMER_SENIOR_ROLES.has(role);
}

/**
 * Снять таймер: кто поставил, или старший.
 * Старые карточки без автора — ещё и роль с «назначать таймеры».
 */
export function canUserClearKanbanTimer(input: {
  sessionUserId?: string | null;
  sessionUserRole?: UserRole | null;
  timerStartedByUserId?: string | null;
  canManageTimer: boolean;
}): boolean {
  if (isKanbanTimerSeniorRole(input.sessionUserRole)) return true;
  const uid = String(input.sessionUserId || "").trim();
  const setter = String(input.timerStartedByUserId || "").trim();
  if (uid && setter && uid === setter) return true;
  if (!setter && input.canManageTimer) return true;
  return false;
}
