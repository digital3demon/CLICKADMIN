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
 *
 * Если задан `CRM_DEFAULT_TENANT_SLUG` — **всегда** возвращается он (одна организация в БД:
 * вход с любого поддомена / корня без совпадения с первой меткой хоста).
 */
export function tenantSlugFromHostHeader(
  host: string | null | undefined,
): string {
  const forced = process.env.CRM_DEFAULT_TENANT_SLUG?.trim();
  if (forced) {
    return forced;
  }
  if (!host || !String(host).trim()) {
    return DEFAULT_TENANT_SLUG;
  }
  const h = String(host).split(":")[0]!.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") {
    return DEFAULT_TENANT_SLUG;
  }
  const parts = h.split(".");
  if (parts.length < 2) return DEFAULT_TENANT_SLUG;
  const sub = parts[0] || "";
  if (!sub || RESERVED.has(sub)) return DEFAULT_TENANT_SLUG;
  return sub;
}
