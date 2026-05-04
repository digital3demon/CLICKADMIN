import "server-only";

import type { SessionClaims } from "@/lib/auth/jwt";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";

export async function orderTenantIdForSession(
  session: SessionClaims | null,
): Promise<string | null> {
  if (!session) return null;
  try {
    return await requireSessionTenantId(session);
  } catch {
    return null;
  }
}
