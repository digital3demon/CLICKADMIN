import "server-only";
import type { AppModule } from "@prisma/client";
import type { SessionClaims } from "@/lib/auth/jwt";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";

/**
 * Сессия + флаги модулей (для проверок canManageUsers / аналитики и т.д.).
 */
export async function getSessionWithModuleAccess(): Promise<{
  session: SessionClaims | null;
  access: Record<AppModule, boolean> | null;
}> {
  const session = await getSessionFromCookies();
  if (!session) {
    return { session: null, access: null };
  }
  const access = await getEffectiveModuleAccess(session.tid, session.role);
  return { session, access };
}
