import type { AppModule, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import {
  ALL_APP_MODULES,
  defaultModuleAllowed,
} from "@/lib/role-module-defaults";
import { getModuleForPathname } from "@/lib/role-module-paths";

/**
 * Эффективный набор флагов по модулям: переопределения в БД или дефолт из
 * `defaultModuleAllowed`. Владелец — всегда full true. Однопользовательский режим — full true.
 */
export async function getEffectiveModuleAccess(
  tenantId: string | null | undefined,
  role: UserRole,
): Promise<Record<AppModule, boolean>> {
  if (isSingleUserPortable() || !tenantId || role === "OWNER") {
    const all = {} as Record<AppModule, boolean>;
    for (const m of ALL_APP_MODULES) {
      all[m] = true;
    }
    return all;
  }

  const rows = await prisma.roleModuleAccess.findMany({
    where: { tenantId, role },
    select: { module: true, allowed: true },
  });
  const fromDb = new Map(rows.map((r) => [r.module, r.allowed]));
  const out = {} as Record<AppModule, boolean>;
  for (const m of ALL_APP_MODULES) {
    out[m] = fromDb.has(m) ? fromDb.get(m)! : defaultModuleAllowed(role, m);
  }
  return out;
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
): boolean {
  const m = getModuleForPathname(pathname);
  if (m == null) return true;
  return access[m] === true;
}
