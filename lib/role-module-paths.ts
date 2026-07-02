import type { AppModule } from "@prisma/client";

const HTTP_READ_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

/** Для путей с модулем `CLIENTS`: чтение — CLIENTS_VIEW, иначе — CLIENTS_EDIT. */
export function clientsBranchModuleForMethod(method: string): "CLIENTS_VIEW" | "CLIENTS_EDIT" {
  return HTTP_READ_METHODS.has(method.toUpperCase()) ? "CLIENTS_VIEW" : "CLIENTS_EDIT";
}

/** Для путей с модулем `ORDERS`: чтение — ORDERS, создание POST /api/orders — ORDERS_CREATE, иначе — ORDERS_EDIT. */
export function ordersBranchModuleForMethod(
  pathname: string,
  method: string,
): AppModule {
  const m = method.toUpperCase();
  if (HTTP_READ_METHODS.has(m)) return "ORDERS";
  if (pathname === "/api/orders" && m === "POST") return "ORDERS_CREATE";
  return "ORDERS_EDIT";
}

const ORDER_ID_API_PATH_RE = /^\/api\/orders\/[^/]+\/(.+)$/;

/**
 * API чата наряда — отдельный модуль ORDERS_CHAT (не ORDERS_EDIT).
 * GET /chat-corrections остаётся на ORDERS (фоновый импорт «!!!» для списка).
 */
export function orderChatApiModuleForPath(
  pathname: string,
  method: string,
): AppModule | null {
  const m = orderIdApiTail(pathname);
  if (!m) return null;
  const tail = m.tail;
  const http = method.toUpperCase();
  if (tail === "kanban-chat") return "ORDERS_CHAT";
  if (tail === "kaiten-lab-mention-ack") return "ORDERS_CHAT";
  if (tail === "kaiten/chat") return "ORDERS_CHAT";
  if (tail === "kaiten/comments") return "ORDERS_CHAT";
  if (tail === "chat-corrections" && !HTTP_READ_METHODS.has(http)) {
    return "ORDERS_CHAT";
  }
  return null;
}

function orderIdApiTail(pathname: string): { tail: string } | null {
  const m = pathname.match(ORDER_ID_API_PATH_RE);
  if (!m?.[1]) return null;
  return { tail: m[1].replace(/\/$/, "") };
}

/** POST вложения к наряду: достаточно ORDERS_EDIT или ORDERS_CHAT. */
export function isOrderAttachmentUploadApiPath(
  pathname: string,
  method: string,
): boolean {
  if (method.toUpperCase() !== "POST") return false;
  const t = orderIdApiTail(pathname);
  return t?.tail === "attachments";
}

/** API настроек печати: GET — просмотр, PATCH — редактирование шаблонов. */
export function printSettingsModuleForMethod(
  method: string,
): "CONFIG_PRINT" | "CONFIG_PRINT_EDIT" {
  return HTTP_READ_METHODS.has(method.toUpperCase())
    ? "CONFIG_PRINT"
    : "CONFIG_PRINT_EDIT";
}

export function isPrintSettingsApiPath(pathname: string): boolean {
  return (
    pathname === "/api/tenant/print-settings" ||
    pathname.startsWith("/api/tenant/print-settings/")
  );
}

/** API и страница настроек почты (не чтение писем в /mail). */
export function isMailSettingsPath(pathname: string, search = ""): boolean {
  if (pathname === "/directory/mail" || pathname.startsWith("/directory/mail/")) {
    return true;
  }
  if (pathname === "/api/mail/accounts" && search.includes("forSettings=1")) {
    return true;
  }
  if (pathname === "/api/mail/accounts" || pathname.startsWith("/api/mail/accounts/")) {
    if (pathname.endsWith("/test") || pathname.endsWith("/diagnose")) return true;
    if (pathname.includes("/reply-template")) return true;
    return false;
  }
  return (
    pathname === "/api/mail/rules" ||
    pathname.startsWith("/api/mail/rules/") ||
    pathname === "/api/mail/folders" ||
    pathname.startsWith("/api/mail/folders/") ||
    pathname === "/api/mail/labels" ||
    pathname.startsWith("/api/mail/labels/")
  );
}

/** Настройки ящика: подключение, правки, удаление (не GET списка для /mail). */
export function mailSettingsModuleForPath(
  pathname: string,
  method: string,
  search = "",
): "CONFIG_MAIL" | "MAIL" {
  const m = method.toUpperCase();
  if (pathname === "/api/mail/accounts" && m === "GET" && !search.includes("forSettings=1")) {
    return "MAIL";
  }
  if (/^\/api\/mail\/accounts\/[^/]+$/.test(pathname) && m !== "GET") {
    return "CONFIG_MAIL";
  }
  if (isMailSettingsPath(pathname, search)) return "CONFIG_MAIL";
  return "MAIL";
}

/** POST accept/reject — CLICKMIG_REVIEW; kanban actions — CLICKMIG_KANBAN. */
export function clickmigBranchModuleForMethod(
  pathname: string,
  method: string,
): AppModule {
  const m = method.toUpperCase();
  if (HTTP_READ_METHODS.has(m)) return "CLICKMIG";
  if (pathname.includes("/accept") || pathname.includes("/reject")) {
    return "CLICKMIG_REVIEW";
  }
  if (
    pathname.includes("/kanban") ||
    pathname.includes("/stage-action") ||
    pathname.includes("/block") ||
    pathname.includes("/move-column")
  ) {
    return "CLICKMIG_KANBAN";
  }
  return "CLICKMIG";
}

type Rule = { prefix: string; module: AppModule };

/**
 * Порядок важен: первый подходящий префикс.
 * `null` — не проверяем по модулям (достаточно входа).
 */
const RULES: Rule[] = [
  { prefix: "/directory/users", module: "CONFIG_USERS" },
  { prefix: "/api/finance-office", module: "FINANCE_OFFICE" },
  { prefix: "/finance-office", module: "FINANCE_OFFICE" },
  { prefix: "/api/mail", module: "MAIL" },
  { prefix: "/mail", module: "MAIL" },
  { prefix: "/api/payroll", module: "PAYROLL" },
  { prefix: "/payroll", module: "PAYROLL" },
  { prefix: "/orders/new", module: "ORDERS_CREATE" },
  { prefix: "/api/orders/reorder-lines", module: "KANBAN_MOVE_TO_OTHER_BOARD" },
  { prefix: "/api/orders/kaiten-due", module: "KANBAN_EDIT_DUE_DATE" },
  { prefix: "/api/orders/kaiten-track", module: "KANBAN_EDIT_TRACK" },
  { prefix: "/api/orders/kaiten-title", module: "KANBAN_EDIT_TITLE" },
  { prefix: "/api/orders/kaiten-assignees", module: "KANBAN_MANAGE_ASSIGNEES" },
  { prefix: "/api/orders/kaiten-participants", module: "KANBAN_MANAGE_PARTICIPANTS" },
  { prefix: "/api/orders/sidebar-recent-paid", module: "SIDEBAR_PAYMENTS" },
  { prefix: "/api/users/invite", module: "CONFIG_USER_INVITES" },
  { prefix: "/api/users", module: "CONFIG_USERS" },
  { prefix: "/directory/costing", module: "CONFIG_COSTING" },
  { prefix: "/api/costing", module: "CONFIG_COSTING" },
  { prefix: "/directory/price", module: "CONFIG_PRICING" },
  { prefix: "/directory/orders-import-export", module: "CONFIG_ORDERS_IMPORT_EXPORT" },
  { prefix: "/api/orders/import-export", module: "CONFIG_ORDERS_IMPORT_EXPORT" },
  { prefix: "/directory/contracts", module: "CONFIG_CONTRACT_TEMPLATE" },
  { prefix: "/directory/mail", module: "CONFIG_MAIL" },
  { prefix: "/directory/warehouse", module: "CONFIG_WAREHOUSE" },
  { prefix: "/directory/kanban-boards", module: "CONFIG_KANBAN_BOARDS" },
  { prefix: "/directory/kaiten", module: "CONFIG_KAITEN" },
  { prefix: "/api/kaiten-card-types", module: "CONFIG_KAITEN" },
  { prefix: "/directory/couriers", module: "CONFIG_COURIERS" },
  { prefix: "/directory/print", module: "CONFIG_PRINT" },
  { prefix: "/api/tenant/print-settings", module: "CONFIG_PRINT" },
  { prefix: "/directory/appearance", module: "CONFIG_APPEARANCE" },
  { prefix: "/directory/clickmig", module: "CONFIG_CLICKMIG" },
  { prefix: "/api/clickmig", module: "CLICKMIG" },
  { prefix: "/clickmig", module: "CLICKMIG" },
  { prefix: "/api/directory", module: "DIRECTORY" },
  { prefix: "/orders/history", module: "ORDER_HISTORY" },
  { prefix: "/orders", module: "ORDERS" },
  { prefix: "/api/orders", module: "ORDERS" },
  { prefix: "/api/order-number-settings", module: "ORDERS" },
  { prefix: "/api/construction-types", module: "ORDERS" },
  { prefix: "/api/materials", module: "ORDERS" },
  { prefix: "/api/order-attachments", module: "ORDERS" },
  { prefix: "/api/kaiten", module: "ORDERS" },
  { prefix: "/api/order-chat-corrections", module: "ORDERS" },
  { prefix: "/api/order-chat-messages", module: "ORDERS_CHAT" },
  { prefix: "/api/order-prosthetics-requests", module: "ORDERS" },
  { prefix: "/api/reorder-lines", module: "ORDERS" },
  { prefix: "/api/inventory", module: "WAREHOUSE" },
  { prefix: "/api/shipments", module: "SHIPMENTS" },
  { prefix: "/api/attention", module: "ATTENTION" },
  { prefix: "/api/attention-reminders", module: "ATTENTION" },
  { prefix: "/api/warehouse", module: "WAREHOUSE" },
  { prefix: "/api/analytics", module: "ANALYTICS" },
  { prefix: "/api/clinics", module: "CLIENTS" },
  { prefix: "/api/doctors", module: "CLIENTS" },
  { prefix: "/api/contractor", module: "CLIENTS" },
  { prefix: "/api/contractor-revisions", module: "CLIENTS" },
  { prefix: "/api/contractor-history", module: "CLIENTS" },
  { prefix: "/kanban", module: "KANBAN" },
  { prefix: "/api/kanban", module: "KANBAN" },
  { prefix: "/analytics", module: "ANALYTICS" },
  { prefix: "/shipments", module: "SHIPMENTS" },
  { prefix: "/warehouse", module: "WAREHOUSE" },
  { prefix: "/inventory", module: "WAREHOUSE" },
  { prefix: "/messengers", module: "CLIENTS" },
  { prefix: "/api/messengers", module: "CLIENTS" },
  { prefix: "/clients", module: "CLIENTS" },
  { prefix: "/contractors", module: "CLIENTS" },
  { prefix: "/attention", module: "ATTENTION" },
  { prefix: "/api/invoice-attachments", module: "ORDERS" },
  { prefix: "/api/price", module: "CONFIG_PRICING" },
  { prefix: "/api/price-categories", module: "CONFIG_PRICING" },
  { prefix: "/api/price-entities", module: "CONFIG_PRICING" },
];

/**
 * null — для этого пути проверка по модулям не применяется.
 */
/** Учитывает ветвление CLIENTS и API настроек печати по HTTP-методу. */
export function requiredModuleForPath(
  pathname: string,
  base: AppModule | null,
  method?: string,
  search = "",
): AppModule | null {
  const chatModule = orderChatApiModuleForPath(pathname, method ?? "GET");
  if (chatModule) return chatModule;
  if (base == null) return null;
  const m = (method ?? "GET").toUpperCase();
  if (base === "CLIENTS") return clientsBranchModuleForMethod(m);
  if (base === "ORDERS") return ordersBranchModuleForMethod(pathname, m);
  if (base === "CLICKMIG") return clickmigBranchModuleForMethod(pathname, m);
  if (base === "CONFIG_PRINT" && isPrintSettingsApiPath(pathname)) {
    return printSettingsModuleForMethod(m);
  }
  if (base === "MAIL" || pathname.startsWith("/api/mail")) {
    return mailSettingsModuleForPath(pathname, m, search);
  }
  return base;
}

export function getModuleForPathname(pathname: string): AppModule | null {
  if (pathname === "/") {
    return null;
  }
  if (pathname.startsWith("/directory/profile")) {
    return null;
  }
  if (pathname.startsWith("/directory/profile/")) {
    return null;
  }
  if (pathname.startsWith("/api/me/")) {
    return null;
  }
  if (pathname.startsWith("/api/user-avatars/")) {
    return null;
  }
  if (
    pathname.startsWith("/api/clinics/") &&
    (pathname.endsWith("/contract") || pathname.includes("/contract/"))
  ) {
    return "CONFIG_CONTRACT_TEMPLATE";
  }
  /** Хаб /directory: видимость плиток на стороне страницы, не блокируем воротами. */
  if (pathname === "/directory") {
    return null;
  }
  for (const rule of RULES) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.module;
    }
  }
  // Остальные пути (редкие) — не блокируем по матрице (только сессия)
  if (
    pathname.startsWith("/api/telegram") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/health")
  ) {
    return null;
  }
  if (pathname.startsWith("/api/auth")) {
    return null;
  }
  if (pathname.startsWith("/api/demo")) {
    return null;
  }
  if (pathname.startsWith("/api/upload")) {
    return null;
  }
  if (pathname.startsWith("/api/tenants")) {
    return null;
  }
  return null;
}
