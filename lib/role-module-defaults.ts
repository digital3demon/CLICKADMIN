import type { AppModule, UserRole } from "@prisma/client";

/** Как в canAccessFinancialAnalytics: без ADMINISTRATOR. */
const DEFAULT_ANALYTICS_ROLES: readonly UserRole[] = [
  "SENIOR_ADMINISTRATOR",
  "ACCOUNTANT",
  "FINANCIAL_MANAGER",
];

/** Все модули в одном списке (для UI и сидов). */
export const ALL_APP_MODULES: AppModule[] = [
  "ORDERS",
  "KANBAN",
  "ORDER_HISTORY",
  "ANALYTICS",
  "SHIPMENTS",
  "WAREHOUSE",
  "CLIENTS",
  "ATTENTION",
  "DIRECTORY",
  "CONFIG_PRICING",
  "CONFIG_WAREHOUSE",
  "CONFIG_KANBAN_BOARDS",
  "CONFIG_KAITEN",
  "CONFIG_COURIERS",
  "CONFIG_COSTING",
  "CONFIG_USERS",
  "CONFIG_USER_INVITES",
];

export const APP_MODULE_LABELS: Record<AppModule, string> = {
  ORDERS: "Заказы",
  KANBAN: "Канбан",
  ORDER_HISTORY: "История изменений",
  ANALYTICS: "Аналитика",
  SHIPMENTS: "Отгрузки",
  WAREHOUSE: "Склад (раздел)",
  CLIENTS: "Клиенты",
  ATTENTION: "Внимание / напоминания",
  DIRECTORY: "Конфигурация (хаб)",
  CONFIG_PRICING: "Конфиг: прайс",
  CONFIG_WAREHOUSE: "Конфиг: склад",
  CONFIG_KANBAN_BOARDS: "Конфиг: доски канбана",
  CONFIG_KAITEN: "Конфиг: Kaiten",
  CONFIG_COURIERS: "Конфиг: курьеры",
  CONFIG_COSTING: "Просчёт работ",
  CONFIG_USERS: "Пользователи",
  CONFIG_USER_INVITES: "Приглашения пользователей",
};

/** Все роли, кроме владельца (у владельца по определению полный доступ). */
export const ROLES_IN_ACCESS_MATRIX: UserRole[] = [
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
  "MANAGER",
  "ACCOUNTANT",
  "FINANCIAL_MANAGER",
  "USER",
];

/**
 * Базовое правило до переопределений в БД.
 * Владелец — всегда true (см. getEffectiveModuleAccess).
 */
export function defaultModuleAllowed(
  role: UserRole,
  module: AppModule,
): boolean {
  if (role === "OWNER") {
    return true;
  }
  if (role === "USER") {
    return module === "KANBAN";
  }
  if (role === "MANAGER") {
    return module !== "CONFIG_USER_INVITES";
  }

  const sameAsOrders = (m: AppModule) =>
    m === "ORDERS" || m === "ORDER_HISTORY" || m === "ATTENTION";

  if (sameAsOrders(module)) {
    return true;
  }

  switch (module) {
    case "KANBAN":
      return true;
    case "ANALYTICS":
      return DEFAULT_ANALYTICS_ROLES.includes(role);
    case "SHIPMENTS":
    case "WAREHOUSE":
    case "CLIENTS":
    case "DIRECTORY":
    case "CONFIG_PRICING":
    case "CONFIG_WAREHOUSE":
    case "CONFIG_KANBAN_BOARDS":
    case "CONFIG_KAITEN":
    case "CONFIG_COURIERS":
      return true;
    case "CONFIG_COSTING":
    case "CONFIG_USERS":
      return false;
    case "CONFIG_USER_INVITES":
      return false;
    default:
      return true;
  }
}
