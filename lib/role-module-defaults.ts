import type { AppModule, UserRole } from "@prisma/client";

/** Как в canAccessFinancialAnalytics: без ADMINISTRATOR. */
const DEFAULT_ANALYTICS_ROLES: readonly UserRole[] = [
  "SENIOR_ADMINISTRATOR",
  "ACCOUNTANT",
  "FINANCIAL_MANAGER",
];

/** Права на действия в карточке CRM-канбана; без базового `KANBAN` в матрице не переключаются отдельно. */
export function isKanbanCardSubmodule(module: AppModule): boolean {
  return module.startsWith("KANBAN_");
}

/** Все модули в одном списке (для UI и сидов). */
export const ALL_APP_MODULES: AppModule[] = [
  "ORDERS",
  "ORDERS_CREATE",
  "ORDERS_EDIT",
  "ORDERS_CHAT",
  "KANBAN",
  "KANBAN_EDIT_TITLE",
  "KANBAN_EDIT_DUE_DATE",
  "KANBAN_EDIT_TRACK",
  "KANBAN_MANAGE_ASSIGNEES",
  "KANBAN_MANAGE_PARTICIPANTS",
  "KANBAN_MOVE_TO_OTHER_BOARD",
  "KANBAN_MANAGE_CHECKLIST",
  "KANBAN_MANAGE_TIMER",
  "ORDER_HISTORY",
  "ANALYTICS",
  "SIDEBAR_PAYMENTS",
  "PAYROLL",
  "FINANCE_OFFICE",
  "MAIL",
  "SHIPMENTS",
  "WAREHOUSE",
  "CLIENTS_VIEW",
  "CLIENTS_EDIT",
  "ATTENTION",
  "DIRECTORY",
  "CONFIG_PRICING",
  "CONFIG_PRICING_CORRECTION",
  "CONFIG_WAREHOUSE",
  "CONFIG_KANBAN_BOARDS",
  "CONFIG_KANBAN_PRODUCTION",
  "CONFIG_KANBAN_CARD_TYPES",
  "CONFIG_KAITEN",
  "CONFIG_COURIERS",
  "CONFIG_ORDERS_IMPORT_EXPORT",
  "CONFIG_CONTRACT_TEMPLATE",
  "CONFIG_COSTING",
  "CONFIG_USERS",
  "CONFIG_USER_INVITES",
  "CONFIG_PRINT",
  "CONFIG_PRINT_EDIT",
  "CONFIG_APPEARANCE",
  "CONFIG_MAIL",
  "CLICKMIG",
  "CLICKMIG_REVIEW",
  "CLICKMIG_KANBAN",
  "CONFIG_CLICKMIG",
  "AI_ADMIN",
];

export const APP_MODULE_LABELS: Record<AppModule, string> = {
  ORDERS: "Заказы",
  ORDERS_CREATE: "Создание заказа",
  ORDERS_EDIT: "Редактирование заказа",
  ORDERS_CHAT: "Чат в наряде (Kaiten / канбан)",
  KANBAN: "Канбан",
  KANBAN_EDIT_TITLE: "Канбан: менять заголовок карточки",
  KANBAN_EDIT_DUE_DATE: "Канбан: менять срок",
  KANBAN_EDIT_TRACK: "Канбан: менять дорожку/доску в карточке",
  KANBAN_MANAGE_ASSIGNEES: "Канбан: менять ответственных",
  KANBAN_MANAGE_PARTICIPANTS: "Канбан: менять участников",
  KANBAN_MOVE_TO_OTHER_BOARD: "Канбан: переносить на другую доску",
  KANBAN_MANAGE_CHECKLIST: "Канбан: чек-листы",
  KANBAN_MANAGE_TIMER: "Канбан: назначать таймеры (просмотр — у всех)",
  ORDER_HISTORY: "История изменений",
  ANALYTICS: "Аналитика",
  SIDEBAR_PAYMENTS: "Сайдбар: блок оплат",
  PAYROLL: "Зарплата",
  FINANCE_OFFICE: "ФинОтдел",
  MAIL: "Почта",
  SHIPMENTS: "Отгрузки",
  WAREHOUSE: "Склад (раздел)",
  CLIENTS: "Клиенты (устар., не настраивать)",
  CLIENTS_VIEW: "Клиенты: просмотр",
  CLIENTS_EDIT: "Клиенты: изменение данных",
  ATTENTION: "Внимание / напоминания",
  DIRECTORY: "Конфигурация (хаб)",
  CONFIG_PRICING: "Конфиг: прайс",
  CONFIG_PRICING_CORRECTION: "Конфиг: коррекция актуального прайса",
  CONFIG_WAREHOUSE: "Конфиг: склад",
  CONFIG_KANBAN_BOARDS: "Конфиг: доски канбана",
  CONFIG_KANBAN_PRODUCTION: "Конфиг: канбан — производственный контур",
  CONFIG_KANBAN_CARD_TYPES: "Конфиг: типы карточек канбана",
  CONFIG_KAITEN: "Конфиг: Kaiten",
  CONFIG_COURIERS: "Конфиг: курьеры",
  CONFIG_ORDERS_IMPORT_EXPORT: "Конфиг: экспорт / импорт работ",
  CONFIG_CONTRACT_TEMPLATE: "Конфиг: шаблон договора",
  CONFIG_COSTING: "Просчёт работ",
  CONFIG_USERS: "Пользователи",
  CONFIG_USER_INVITES: "Приглашения пользователей",
  CONFIG_PRINT: "Конфиг: печать (этикетки)",
  CONFIG_PRINT_EDIT: "Конфиг: редактирование этикеток",
  CONFIG_APPEARANCE: "Конфиг: оформление интерфейса",
  CONFIG_MAIL: "Конфиг: почта",
  CLICKMIG: "КликМиг",
  CLICKMIG_REVIEW: "КликМиг: принять / отказать заявку",
  CLICKMIG_KANBAN: "КликМиг: канбан",
  CONFIG_CLICKMIG: "Конфиг: КликМиг",
  AI_ADMIN: "ИИ-Админ",
};

/** Только владелец (OWNER); см. getEffectiveModuleAccess. */
export const CLICKMIG_OWNER_ONLY_MODULES: readonly AppModule[] = [
  "CLICKMIG",
  "CLICKMIG_REVIEW",
  "CLICKMIG_KANBAN",
  "CONFIG_CLICKMIG",
  "AI_ADMIN",
] as const;

export function isClickMigOwnerOnlyModule(module: AppModule): boolean {
  return (CLICKMIG_OWNER_ONLY_MODULES as readonly AppModule[]).includes(module);
}

/** Все роли, кроме владельца (у владельца по определению полный доступ). */
export const ROLES_IN_ACCESS_MATRIX: UserRole[] = [
  "ADMINISTRATOR",
  "SENIOR_ADMINISTRATOR",
  "SENIOR_TECHNICIAN",
  "PRODUCTION",
  "SENIOR_PRODUCTION",
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
  if (
    module === "KANBAN_MANAGE_TIMER" &&
    (role === "USER" || role === "PRODUCTION" || role === "SENIOR_PRODUCTION")
  ) {
    return false;
  }
  if (role === "USER") {
    return (
      module === "KANBAN" ||
      module === "KANBAN_MANAGE_CHECKLIST" ||
      module === "PAYROLL"
    );
  }
  if (role === "PRODUCTION" || role === "SENIOR_PRODUCTION") {
    return (
      module === "KANBAN" ||
      module === "CONFIG_KANBAN_PRODUCTION" ||
      module === "KANBAN_MANAGE_CHECKLIST"
    );
  }
  if (role === "MANAGER") {
    if (isClickMigOwnerOnlyModule(module)) return false;
    return module !== "CONFIG_USER_INVITES";
  }
  if (role === "SENIOR_TECHNICIAN") {
    return (
      module === "KANBAN" ||
      module === "KANBAN_MANAGE_CHECKLIST" ||
      module === "KANBAN_MANAGE_TIMER" ||
      module === "PAYROLL" ||
      module === "ORDERS_CHAT"
    );
  }

  const sameAsOrders = (m: AppModule) =>
    m === "ORDERS" ||
    m === "ORDERS_CREATE" ||
    m === "ORDER_HISTORY" ||
    m === "ATTENTION";

  if (sameAsOrders(module)) {
    return true;
  }

  switch (module) {
    case "ORDERS_EDIT":
      return (
        role === "ADMINISTRATOR" ||
        role === "SENIOR_ADMINISTRATOR" ||
        role === "FINANCIAL_MANAGER"
      );
    case "ORDERS_CHAT":
      return (
        role === "ADMINISTRATOR" ||
        role === "SENIOR_ADMINISTRATOR" ||
        role === "FINANCIAL_MANAGER" ||
        role === "ACCOUNTANT"
      );
    case "KANBAN":
      return true;
    case "KANBAN_EDIT_TITLE":
    case "KANBAN_EDIT_DUE_DATE":
    case "KANBAN_EDIT_TRACK":
    case "KANBAN_MANAGE_ASSIGNEES":
    case "KANBAN_MANAGE_PARTICIPANTS":
    case "KANBAN_MOVE_TO_OTHER_BOARD":
    case "KANBAN_MANAGE_CHECKLIST":
    case "KANBAN_MANAGE_TIMER":
      return true;
    case "ANALYTICS":
      return DEFAULT_ANALYTICS_ROLES.includes(role);
    case "SIDEBAR_PAYMENTS":
      return true;
    case "PAYROLL":
      return false;
    case "FINANCE_OFFICE":
      return role === "ACCOUNTANT" || role === "FINANCIAL_MANAGER";
    case "MAIL":
      return (["ADMINISTRATOR", "SENIOR_ADMINISTRATOR", "MANAGER"] as UserRole[]).includes(role);
    case "SHIPMENTS":
    case "WAREHOUSE":
    case "CLIENTS":
    case "CLIENTS_VIEW":
    case "CLIENTS_EDIT":
    case "DIRECTORY":
    case "CONFIG_PRICING":
    case "CONFIG_WAREHOUSE":
    case "CONFIG_KANBAN_BOARDS":
    case "CONFIG_KANBAN_PRODUCTION":
    case "CONFIG_KANBAN_CARD_TYPES":
    case "CONFIG_KAITEN":
    case "CONFIG_COURIERS":
    case "CONFIG_ORDERS_IMPORT_EXPORT":
    case "CONFIG_CONTRACT_TEMPLATE":
    case "CONFIG_PRINT":
    case "CONFIG_APPEARANCE":
    case "CONFIG_MAIL":
      return true;
    case "CONFIG_PRINT_EDIT":
      return (
        role === "ADMINISTRATOR" || role === "SENIOR_ADMINISTRATOR"
      );
    case "CONFIG_PRICING_CORRECTION":
      return false;
    case "CONFIG_COSTING":
    case "CONFIG_USERS":
      return false;
    case "CONFIG_USER_INVITES":
      return false;
    case "CLICKMIG":
    case "CLICKMIG_REVIEW":
    case "CLICKMIG_KANBAN":
    case "CONFIG_CLICKMIG":
      return false;
    case "AI_ADMIN":
      return false;
    default:
      return true;
  }
}
