import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionClaims } from "@/lib/auth/jwt";

/** Выбрасывается, если у пользователя нет строки Tenant (битые данные после миграций). */
export const SESSION_MISSING_TENANT_ERROR = "CRM_SESSION_MISSING_TENANT";

export async function sessionClaimsForUserId(
  userId: string,
): Promise<SessionClaims> {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { tenant: true },
  });
  const t = u.tenant;
  if (!t) {
    throw new Error(SESSION_MISSING_TENANT_ERROR);
  }
  return {
    sub: u.id,
    email: u.email,
    role: u.role,
    name: u.displayName,
    tid: u.tenantId,
    plan: t.plan,
    addonKanban: t.addonKanban,
  };
}
