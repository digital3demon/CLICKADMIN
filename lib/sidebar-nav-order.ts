export const SIDEBAR_NAV_ORDER_KEY = "sidebarNavOrderV1";

export const DEFAULT_SIDEBAR_HREF_ORDER = [
  "/orders",
  "/kanban",
  "/orders/history",
  "/analytics",
  "/payroll",
  "/finance-office",
  "/clickmig",
  "/mail",
  "/ai-admin",
  "/warehouse",
  "/work-examples",
  "/protocols",
  "/clients",
  "/directory",
] as const;

/** Старые пункты меню → канон (отгрузки убраны из сайдбара, живут в Заказах). */
const SIDEBAR_HREF_ALIASES: Record<string, string> = {
  "/shipments": "/orders",
  "/orders?ship=actual": "/orders",
};

const KNOWN_SIDEBAR_HREFS = new Set<string>([
  ...DEFAULT_SIDEBAR_HREF_ORDER,
  "/shipments",
  "/orders?ship=actual",
]);

export function normalizeSidebarNavOrder(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    const href = SIDEBAR_HREF_ALIASES[trimmed] ?? trimmed;
    if (!KNOWN_SIDEBAR_HREFS.has(href) && !KNOWN_SIDEBAR_HREFS.has(trimmed)) {
      continue;
    }
    const canonical = SIDEBAR_HREF_ALIASES[href] ?? href;
    if (!out.includes(canonical)) out.push(canonical);
  }
  return out.length > 0 ? out : null;
}

export function coalesceSidebarNavOrder(
  saved: readonly string[],
  allowedHrefs: Set<string>,
): string[] {
  const out: string[] = [];
  for (const href of saved) {
    const canonical = SIDEBAR_HREF_ALIASES[href] ?? href;
    if (allowedHrefs.has(canonical) && !out.includes(canonical)) {
      out.push(canonical);
    }
  }
  for (const href of DEFAULT_SIDEBAR_HREF_ORDER) {
    if (allowedHrefs.has(href) && !out.includes(href)) out.push(href);
  }
  return out;
}
