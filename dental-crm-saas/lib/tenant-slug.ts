import { DEFAULT_TENANT_SLUG } from "@/lib/tenant-constants";

const RESERVED = new Set([
  "www",
  "api",
  "app",
  "mail",
  "static",
  "cdn",
  "admin",
]);

/**
 * Поддомен `xxx` из `xxx.click-lab.online`. Localhost / зарезервированные → default.
 * Не полагается на `\b` для кириллицы в URI — только на разбор хоста.
 */
export function tenantSlugFromHostHeader(
  host: string | null | undefined,
): string {
  const fromEnv = process.env.CRM_DEFAULT_TENANT_SLUG?.trim();
  if (!host || !String(host).trim()) {
    return fromEnv || DEFAULT_TENANT_SLUG;
  }
  const h = String(host).split(":")[0]!.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") {
    return fromEnv || DEFAULT_TENANT_SLUG;
  }
  const parts = h.split(".");
  if (parts.length < 2) return fromEnv || DEFAULT_TENANT_SLUG;
  const sub = parts[0] || "";
  if (!sub || RESERVED.has(sub)) return fromEnv || DEFAULT_TENANT_SLUG;
  return sub;
}

/** Лендинг ввода префикса (как `crm.click-lab.online`) — сравнение с env или эвристика. */
export function isPortalCrmHost(host: string | null | undefined): boolean {
  const h = String(host ?? "")
    .toLowerCase()
    .split(":")[0]!;
  const portal = process.env.CRM_PORTAL_HOST?.trim().toLowerCase();
  if (portal) return h === portal;
  if (h === "crm.click-lab.online") return true;
  return /^crm[.-]/.test(h);
}
