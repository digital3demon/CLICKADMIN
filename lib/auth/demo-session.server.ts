import "server-only";

import { getDemoAccessPrisma } from "@/lib/prisma-demo-access";
import { isDemoAccessSessionExpired } from "@/lib/auth/demo-access-session-policy";

/**
 * Активна ли демо-сессия по sid из JWT.
 * При истечении 12 ч код помечается отозванным (lazy revoke).
 */
export async function assertDemoAccessSessionActive(
  sid: string | null | undefined,
): Promise<boolean> {
  const trimmed = sid?.trim();
  if (!trimmed) return false;

  const db = getDemoAccessPrisma();
  const row = await db.demoAccessCode.findFirst({
    where: { boundSid: trimmed },
    select: { id: true, consumedAt: true, revokedAt: true },
  });
  if (!row) return false;

  if (isDemoAccessSessionExpired(row)) {
    if (!row.revokedAt && row.consumedAt) {
      await db.demoAccessCode
        .updateMany({
          where: { id: row.id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        .catch(() => {});
    }
    return false;
  }

  return true;
}
