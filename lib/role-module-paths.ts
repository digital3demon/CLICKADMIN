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
  if (tail === "kanban-chat") return "KANBAN_CARD_CHAT";
  if (tail === "kaiten-lab-mention-ack") return "ORDERS";
  /* GET чата/файлов — канбан без модуля ORDERS (производство, USER). POST комментария Kaiten — ORDERS. */
  if (tail === "kaiten/chat") {
    return HTTP_READ_METHODS.has(http) ? "KANBAN_CARD_CHAT" : "ORDERS";
  }
  if (tail === "kaiten/comments") {
    return HTTP_READ_METHODS.has(http) ? "KANBAN_CARD_CHAT" : "ORDERS";
  }
  if (tail === "kaiten/card-head") return "KANBAN_CARD_CHAT";
  if (tail === "kaiten/files" || tail.startsWith("kaiten/files/")) {
    return HTTP_READ_METHODS.has(http) ? "KANBAN_CARD_CHAT" : "ORDERS";
  }
  if (tail === "chat-corrections" && !HTTP_READ_METHODS.has(http)) {
    return "ORDERS";
  }
  return null;
}

/**
 * PATCH карточки Kaiten по наряду (колонка, sort_order, блок…) — канбан,
 * не редактирование наряда (ORDERS_EDIT).
 */
export function orderKaitenMirrorApiModuleForPath(
  pathname: string,
  method: string,
): AppModule | null {
  const t = orderIdApiTail(pathname);
  if (!t) return null;
  const http = method.toUpperCase();
  if (t.tail === "kanban-next-column") {
    return "KANBAN_MOVE_COLUMNS";
  }
  if (t.tail !== "kaiten") return null;
  if (HTTP_READ_METHODS.has(http)) return null;
  return "KANBAN_MOVE_COLUMNS";
}

function orderIdApiTail(pathname: string): { tail: string } | null {
  const m = pathname.match(ORDER_ID_API_PATH_RE);
  if (!m?.[1]) return null;
  return { tail: m[1].replace(/\/$/, "") };
}

/** POST вложения к наряду из формы наряда — ORDERS_EDIT; из канбана — KANBAN_ATTACH_FILES. */
export function isOrderAttachmentUploadApiPath(
  pathname: string,
  method: string,
): boolean {
  if (method.toUpperCase() !== "POST") return false;
  const t = orderIdApiTail(pathname);
  return t?.tail === "attachments";
}

/** Заголовок X-Upload-Context: kanban — загрузка из CRM-канбана. */
export function isKanbanAttachmentUploadRequest(headers: {
  get(name: string): string | null;
}): boolean {
  const ctx = (headers.get("x-upload-context") || "").trim().toLowerCase();
  return ctx === "kanban";
}

export function orderAttachmentUploadModule(
  pathname: string,
  method: string,
  headers?: { get(name: string): string | null },
): AppModule | null {
  if (!isOrderAttachmentUploadApiPath(pathname, method)) return null;
  if (headers && isKanbanAttachmentUploadRequest(headers)) {
    return "KANBAN_ATTACH_FILES";
  }
  return "ORDERS_EDIT";
}

/** Доступ к POST `/api/orders/:id/attachments` с учётом контекста (канбан / форма наряда). */
export function isOrderAttachmentUploadAllowed(
  access: Partial<Record<AppModule, boolean>>,
  pathname: string,
  method: string,
  headers?: { get(name: string): string | null },
): boolean {
  const required = orderAttachmentUploadModule(pathname, method, headers);
  if (!required) return true;
  if (access[required] === true) return true;
  if (!isOrderAttachmentUploadApiPath(pathname, method)) return false;

  if (
    required === "KANBAN_ATTACH_FILES" &&
    headers &&
    isKanbanAttachmentUploadRequest(headers)
  ) {
    return (
      access.KANBAN_ATTACH_FILES === true ||
      access.KANBAN_CARD_CHAT === true ||
      access.KANBAN_MOVE_COLUMNS === true ||
      access.KANBAN_MANAGE_CHECKLIST === true ||
      access.KANBAN === true
    );
  }

  if (required === "ORDERS_EDIT") {
    return (
      access.ORDERS_EDIT === true ||
      access.ORDERS_CHAT === true ||
      access.ORDERS_CREATE === true ||
      access.KANBAN_ATTACH_FILES === true
    );
  }

  return false;
}

/** GET ленты/файлов карточки: канбан без пакета «Наряды». */
export function isKanbanLinkedReadPath(pathname: string): boolean {
  const t = orderIdApiTail(pathname);
  if (!t) return false;
  const tail = t.tail;
  if (tail === "kaiten/chat") return true;
  if (tail === "kaiten/comments") return true;
  if (tail === "kaiten/card-head") return true;
  if (tail === "kaiten/files" || tail.startsWith("kaiten/files/")) return true;
  if (tail === "attachments" || tail.startsWith("attachments/")) return true;
  return false;
}

export function isKanbanLinkedReadAllowed(
  access: Partial<Record<AppModule, boolean>>,
  pathname: string,
  method: string,
): boolean {
  if (!HTTP_READ_METHODS.has(method.toUpperCase())) return false;
  if (!isKanbanLinkedReadPath(pathname)) return false;
  return (
    access.KANBAN_CARD_CHAT === true ||
    access.KANBAN === true ||
    access.KANBAN_ATTACH_FILES === true ||
    access.ORDERS === true ||
    access.ORDERS_CHAT === true
  );
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
  { prefix: "/api/ai-admin", module: "AI_ADMIN" },
  { prefix: "/ai-admin", module: "AI_ADMIN" },
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
  { prefix: "/directory/finance-office", module: "FINANCE_OFFICE" },
  { prefix: "/api/directory/finance-office", module: "FINANCE_OFFICE" },
  { prefix: "/directory/warehouse", module: "CONFIG_WAREHOUSE" },
  { prefix: "/api/tenant/kaiten-integration", module: "CONFIG_KANBAN_BOARDS" },
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
  { prefix: "/api/orders/ai-prefill", module: "AI_MODE" },
  { prefix: "/api/orders", module: "ORDERS" },
  { prefix: "/api/order-number-settings", module: "ORDERS" },
  { prefix: "/api/construction-types", module: "ORDERS" },
  { prefix: "/api/materials", module: "ORDERS" },
  { prefix: "/api/order-attachments", module: "ORDERS" },
  { prefix: "/api/lab-tasks", module: "ORDERS" },
  { prefix: "/api/kaiten", module: "ORDERS" },

  { prefix: "/api/order-notifications", module: "ORDERS" },
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
  { prefix: "/api/work-examples", module: "WORK_EXAMPLES" },
  { prefix: "/work-examples", module: "WORK_EXAMPLES" },
  { prefix: "/protocols", module: "PROTOCOLS_REFS" },
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
/** Отправка счёта/УПД и ответ из документооборота: доступ проверяет сам роут (ORDERS или ФинОтдел). */
export function isOrderDocumentMailApiPath(pathname: string): boolean {
  return (
    /\/api\/orders\/[^/]+\/send-documents\/?$/u.test(pathname) ||
    /\/api\/orders\/[^/]+\/document-mail\/?$/u.test(pathname) ||
    /\/api\/orders\/[^/]+\/source-emails\/?$/u.test(pathname)
  );
}

export function requiredModuleForPath(
  pathname: string,
  base: AppModule | null,
  method?: string,
  search = "",
  headers?: { get(name: string): string | null },
): AppModule | null {
  if (isOrderDocumentMailApiPath(pathname)) return null;
  const chatModule = orderChatApiModuleForPath(pathname, method ?? "GET");
  if (chatModule) return chatModule;
  const kaitenMirrorModule = orderKaitenMirrorApiModuleForPath(
    pathname,
    method ?? "GET",
  );
  if (kaitenMirrorModule) return kaitenMirrorModule;
  const attachModule = orderAttachmentUploadModule(
    pathname,
    method ?? "GET",
    headers,
  );
  if (attachModule) return attachModule;
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
  if (/^\/api\/orders\/[^/]+\/kaiten-assignees\/?$/.test(pathname)) {
    return "KANBAN_MANAGE_ASSIGNEES";
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
