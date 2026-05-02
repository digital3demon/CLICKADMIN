import type { AppModule } from "@prisma/client";

type Rule = { prefix: string; module: AppModule };

/**
 * Порядок важен: первый подходящий префикс.
 * `null` — не проверяем по модулям (достаточно входа).
 */
const RULES: Rule[] = [
  { prefix: "/directory/users", module: "CONFIG_USERS" },
  { prefix: "/api/users/invite", module: "CONFIG_USER_INVITES" },
  { prefix: "/api/users", module: "CONFIG_USERS" },
  { prefix: "/directory/costing", module: "CONFIG_COSTING" },
  { prefix: "/api/costing", module: "CONFIG_COSTING" },
  { prefix: "/directory/price", module: "CONFIG_PRICING" },
  { prefix: "/directory/warehouse", module: "CONFIG_WAREHOUSE" },
  { prefix: "/directory/kanban-boards", module: "CONFIG_KANBAN_BOARDS" },
  { prefix: "/directory/kaiten", module: "CONFIG_KAITEN" },
  { prefix: "/api/kaiten-card-types", module: "CONFIG_KAITEN" },
  { prefix: "/directory/couriers", module: "CONFIG_COURIERS" },
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
  { prefix: "/kanban", module: "KANBAN" },
  { prefix: "/api/kanban", module: "KANBAN" },
  { prefix: "/analytics", module: "ANALYTICS" },
  { prefix: "/shipments", module: "SHIPMENTS" },
  { prefix: "/warehouse", module: "WAREHOUSE" },
  { prefix: "/inventory", module: "WAREHOUSE" },
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
