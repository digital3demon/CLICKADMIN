import type { AppModule, UserRole } from "@prisma/client";

/**
 * «Только канбан» в смысле навигации: нет модуля заказов, но есть канбан.
 * Без `moduleAccess` — по классике, роль `USER`.
 */
export function isKanbanOnlyUser(
  role: UserRole,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  if (moduleAccess) {
    return moduleAccess.ORDERS !== true && moduleAccess.KANBAN === true;
  }
  return role === "USER";
}

/** Стартовый путь после входа (и подсказка клиенту). */
export function defaultHomePathForRole(
  role: UserRole,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): string {
  if (moduleAccess) {
    if (moduleAccess.ORDERS) return "/orders";
    if (moduleAccess.KANBAN) return "/kanban";
    return "/";
  }
  return isKanbanOnlyUser(role) ? "/kanban" : "/orders";
}

const FINANCIAL_ANALYTICS_ROLES: readonly UserRole[] = [
  "OWNER",
  "SENIOR_ADMINISTRATOR",
  "ACCOUNTANT",
  "FINANCIAL_MANAGER",
];

/** Доступ к финансовой аналитике (и связанным API). */
export function canAccessFinancialAnalytics(
  role: UserRole,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  if (moduleAccess && typeof moduleAccess.ANALYTICS === "boolean") {
    return moduleAccess.ANALYTICS;
  }
  return FINANCIAL_ANALYTICS_ROLES.includes(role);
}

/**
 * Приглашение, список и часть API пользователей.
 * Смена ролей сотрудника — отдельно, только `OWNER` (`canChangeUserRoles`).
 */
export function canManageUsers(
  role: UserRole,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  if (role === "OWNER") return true;
  if (moduleAccess?.CONFIG_USERS === true) return true;
  return false;
}

export function canChangeUserRoles(role: UserRole): boolean {
  return role === "OWNER";
}

/** Модуль «Просчёт работ» / себестоимость. */
export function canAccessCostingModule(
  role: UserRole,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  if (role === "OWNER") return true;
  if (moduleAccess?.CONFIG_COSTING === true) return true;
  return false;
}

const ORDER_CHAT_CORRECTION_ACCEPT_ROLES: readonly UserRole[] = [
  "OWNER",
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
  "FINANCIAL_MANAGER",
];

export function canAcceptOrderChatCorrections(role: UserRole): boolean {
  return ORDER_CHAT_CORRECTION_ACCEPT_ROLES.includes(role);
}
