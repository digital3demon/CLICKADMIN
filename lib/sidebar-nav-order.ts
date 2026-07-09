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
  "/orders?ship=actual",
  "/warehouse",
  "/clients",
  "/directory",
] as const;

const SIDEBAR_HREF_ALIASES: Record<string, string> = {
  "/shipments": "/orders?ship=actual",
};

const KNOWN_SIDEBAR_HREFS = new Set<string>([
  ...DEFAULT_SIDEBAR_HREF_ORDER,
  "/shipments",
]);

export function normalizeSidebarNavOrder(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const href = SIDEBAR_HREF_ALIASES[item.trim()] ?? item.trim();
    if (!KNOWN_SIDEBAR_HREFS.has(href) && !KNOWN_SIDEBAR_HREFS.has(item.trim())) {
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
    if (allowedHrefs.has(href) && !out.includes(href)) out.push(href);
  }
  for (const href of DEFAULT_SIDEBAR_HREF_ORDER) {
    if (allowedHrefs.has(href) && !out.includes(href)) out.push(href);
  }
  return out;
}
