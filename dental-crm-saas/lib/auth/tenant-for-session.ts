import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionClaims } from "@/lib/auth/jwt";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-constants";

/** tid в JWT (новые сессии) или чтение из `User` для старых токенов */
export async function getTenantIdForSession(
  session: SessionClaims,
): Promise<string | null> {
  /** Демо-БД: те же правила изоляции, что и у default-tenants в основной схеме */
  if (session.demo) return DEFAULT_TENANT_ID;
  if (session.tid) return session.tid;
  const u = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { tenantId: true },
  });
  return u?.tenantId ?? null;
}

export async function requireSessionTenantId(
  session: SessionClaims,
): Promise<string> {
  const id = await getTenantIdForSession(session);
  if (!id) throw new Error("tenant_context_missing");
  return id;
}
