import type { AppModule, PrismaClient, UserRole } from "@prisma/client";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import {
  ALL_APP_MODULES,
  CLICKMIG_OWNER_ONLY_MODULES,
  defaultModuleAllowed,
} from "@/lib/role-module-defaults";
import { expandBundles } from "@/lib/role-module-bundles";
import { hasDirectoryHubAccess } from "@/lib/role-module-nav";
import {
  getModuleForPathname,
  requiredModuleForPath,
} from "@/lib/role-module-paths";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";

/**
 * Эффективный набор флагов по модулям: переопределения в БД или дефолт из
 * `defaultModuleAllowed`. Владелец — всегда full true. Однопользовательский режим — full true.
 *
 * `options.db` — явный клиент (демо / getPrisma), иначе resolveTenantPrismaClient(tenantId).
 */
export async function getEffectiveModuleAccess(
  tenantId: string | null | undefined,
  role: UserRole,
  options?: { db?: PrismaClient },
): Promise<Record<AppModule, boolean>> {
  if (isSingleUserPortable() || !tenantId || role === "OWNER") {
    const all = {} as Record<AppModule, boolean>;
    for (const m of ALL_APP_MODULES) {
      all[m] = true;
    }
    return all;
  }

  const db = options?.db ?? (await resolveTenantPrismaClient(tenantId));
  const rows = await db.roleModuleAccess.findMany({
    where: { tenantId, role },
    select: { module: true, allowed: true },
  });
  const fromDb = new Map(rows.map((r) => [r.module, r.allowed]));
  const out = {} as Record<AppModule, boolean>;
  for (const m of ALL_APP_MODULES) {
    let v = fromDb.has(m) ? fromDb.get(m)! : defaultModuleAllowed(role, m);
    if (
      (m === "CLIENTS_VIEW" || m === "CLIENTS_EDIT") &&
      !fromDb.has(m) &&
      fromDb.has("CLIENTS")
    ) {
      v = fromDb.get("CLIENTS")!;
    }
    if (
      (m === "ORDERS_NOTIFICATIONS_ADMIN" ||
        m === "ORDERS_NOTIFICATIONS_CORRECTIONS" ||
        m === "ORDERS_NOTIFICATIONS_PROSTHETICS") &&
      !fromDb.has(m) &&
      fromDb.has("ORDERS_NOTIFICATIONS")
    ) {
      v = fromDb.get("ORDERS_NOTIFICATIONS")!;
    }
    out[m] = v;
  }
  for (const m of CLICKMIG_OWNER_ONLY_MODULES) {
    out[m] = false;
  }
  return expandBundles(out);
}

export function moduleAccessForResponse(
  access: Record<AppModule, boolean>,
): Record<string, boolean> {
  return Object.fromEntries(
    ALL_APP_MODULES.map((m) => [m, access[m] === true]),
  ) as Record<string, boolean>;
}

export function isPathAllowedByModuleAccess(
  pathname: string,
  access: Record<AppModule, boolean>,
  method?: string,
): boolean {
  if (pathname === "/directory") {
    return hasDirectoryHubAccess(access);
  }
  if (pathname === "/directory/kanban-boards" || pathname.startsWith("/directory/kanban-boards/")) {
    return (
      access.CONFIG_KANBAN_BOARDS === true ||
      access.CONFIG_KANBAN_PRODUCTION === true ||
      access.CONFIG_KANBAN_CARD_TYPES === true
    );
  }
  const m = getModuleForPathname(pathname);
  if (m == null) return true;
  const need = requiredModuleForPath(pathname, m, method);
  if (need == null) return true;
  return access[need] === true;
}
