import type { UserRole } from "@prisma/client";

/** Роль «Пользователь»: доступ только к `/kanban` и к сессии/выходу. */
export function isKanbanOnlyUser(role: UserRole): boolean {
  return role === "USER";
}

/** Стартовый путь после входа (и подсказка клиенту). */
export function defaultHomePathForRole(role: UserRole): string {
  return isKanbanOnlyUser(role) ? "/kanban" : "/orders";
}

const FINANCIAL_ANALYTICS_ROLES: readonly UserRole[] = [
  "OWNER",
  "SENIOR_ADMINISTRATOR",
  "ACCOUNTANT",
  "FINANCIAL_MANAGER",
];

/** Доступ к финансовой аналитике (и связанным API). */
export function canAccessFinancialAnalytics(role: UserRole): boolean {
  return FINANCIAL_ANALYTICS_ROLES.includes(role);
}

/** Приглашение пользователей и раздел «Пользователи». */
export function canManageUsers(role: UserRole): boolean {
  return role === "OWNER";
}

/** Смена роли существующего пользователя (отдельно от прочих действий в каталоге). */
export function canChangeUserRoles(role: UserRole): boolean {
  return role === "OWNER";
}

/** Модуль «Просчёт работ» / себестоимость в конфигурации. */
export function canAccessCostingModule(role: UserRole): boolean {
  return role === "OWNER";
}

const ORDER_CHAT_CORRECTION_ACCEPT_ROLES: readonly UserRole[] = [
  "OWNER",
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
  "FINANCIAL_MANAGER",
];

/** Принять корректировку из чата («!!!») и отправить ответ в Kaiten. */
export function canAcceptOrderChatCorrections(role: UserRole): boolean {
  return ORDER_CHAT_CORRECTION_ACCEPT_ROLES.includes(role);
}
