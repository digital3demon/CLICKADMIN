import type { AppModule, UserRole } from "@prisma/client";
import { defaultModuleAllowed } from "@/lib/role-module-defaults";
import { parseUserRole } from "@/lib/user-role-labels";

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
  return role === "USER" || role === "PRODUCTION" || role === "SENIOR_PRODUCTION";
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
  "MANAGER",
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

export function canInviteUsers(
  role: UserRole,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  if (!canManageUsers(role, moduleAccess)) return false;
  if (role === "OWNER") return true;
  return moduleAccess?.CONFIG_USER_INVITES === true;
}

export function canChangeUserRoles(role: UserRole): boolean {
  return role === "OWNER";
}

/** Отдельный доступ на создание нового заказа. */
export function canCreateOrders(
  role: UserRole,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  if (role === "OWNER") return true;
  if (moduleAccess?.ORDERS_CREATE === true) return true;
  return false;
}

/** Галочка «ИИ-Режим» на странице заказов и предзаполнение наряда через ИИ. */
export function canUseAiOrderMode(
  role: UserRole,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  if (role === "OWNER") return true;
  if (moduleAccess?.AI_MODE === true) return true;
  return false;
}

/** Редактирование полей существующего наряда (форма, PATCH, быстрые отметки в списке). */
export function canEditOrders(
  role: UserRole,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  if (role === "OWNER") return true;
  if (moduleAccess?.ORDERS_EDIT === true) return true;
  return false;
}

/** Чат наряда в списках заказов, отгрузок и ФинОтдела (пакет ORDERS / просмотр). */
export function canAccessOrderChat(
  role: UserRole,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  if (role === "OWNER") return true;
  if (moduleAccess?.ORDERS === true || moduleAccess?.ORDERS_CHAT === true) {
    return true;
  }
  return false;
}

/**
 * Индикаторы/тосты по типу уведомлений нарядов.
 * Без права — не показываем пилюли, иконки и чипы этого типа.
 */
export function canSeeOrderNotificationKind(
  kind: "admin" | "corrections" | "prosthetics",
  role: UserRole | null | undefined,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  if (role === "OWNER") return true;
  const mod =
    kind === "admin"
      ? "ORDERS_NOTIFICATIONS_ADMIN"
      : kind === "corrections"
        ? "ORDERS_NOTIFICATIONS_CORRECTIONS"
        : "ORDERS_NOTIFICATIONS_PROSTHETICS";
  if (moduleAccess && typeof moduleAccess[mod] === "boolean") {
    return moduleAccess[mod] === true;
  }
  if (
    moduleAccess &&
    typeof moduleAccess.ORDERS_NOTIFICATIONS === "boolean"
  ) {
    return moduleAccess.ORDERS_NOTIFICATIONS === true;
  }
  if (!role) return false;
  return defaultModuleAllowed(role, mod);
}

/** Снять подсветку @лаборатория для всей лаборатории — только админы и владелец. */
export function canAckOrderChatLabMention(role: UserRole): boolean {
  return (
    role === "OWNER" ||
    role === "ADMINISTRATOR" ||
    role === "SENIOR_ADMINISTRATOR"
  );
}

/** Модуль «Конфиг: почта» (/directory/mail) — глобальная галочка в матрице. */
export function canAccessMailSettingsConfig(
  role: UserRole,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  if (role === "OWNER") return true;
  return moduleAccess?.CONFIG_MAIL === true;
}

/**
 * Правка папок, правил и шаблона для ящика:
 * владелец, галочка CONFIG_MAIL в матрице или роль в settingsRoles ящика.
 */
export function userCanManageMailAccountSettings(
  role: UserRole | string,
  accountSettingsRoles: readonly string[] | null | undefined,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  const userRole = typeof role === "string" ? parseUserRole(role) : role;
  if (!userRole) return false;
  if (canAccessMailSettingsConfig(userRole, moduleAccess)) return true;
  return (accountSettingsRoles ?? []).includes(userRole);
}

/** Редактирование шаблонов этикеток и сохранение настроек печати. */
export function canEditStickerPrintSettings(
  role: UserRole,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  if (role === "OWNER") return true;
  if (moduleAccess?.CONFIG_PRINT_EDIT === true) return true;
  return false;
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

/** Видимость блока «Оплаты» в левом сайдбаре. */
export function canAccessSidebarPayments(
  role: UserRole,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  if (role === "OWNER") return true;
  if (moduleAccess && typeof moduleAccess.SIDEBAR_PAYMENTS === "boolean") {
    return moduleAccess.SIDEBAR_PAYMENTS;
  }
  return true;
}

const ORDER_CHAT_CORRECTION_ACCEPT_ROLES: readonly UserRole[] = [
  "OWNER",
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
  "MANAGER",
  "FINANCIAL_MANAGER",
];

export function canAcceptOrderChatCorrections(role: UserRole): boolean {
  return ORDER_CHAT_CORRECTION_ACCEPT_ROLES.includes(role);
}

/** Скрытие строки «Оплаты» в сайдбаре после «прочитано». */
export function canDismissSidebarRecentPaidItems(
  role: UserRole,
  moduleAccess?: Partial<Record<AppModule, boolean>> | null,
): boolean {
  return canAccessSidebarPayments(role, moduleAccess);
}
