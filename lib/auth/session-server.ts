import "server-only";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_DEMO_COOKIE_NAME,
  verifySessionToken,
  type SessionClaims,
} from "@/lib/auth/jwt";
import {
  isSingleUserPortable,
  SINGLE_USER_SESSION,
} from "@/lib/auth/single-user";
import { prisma } from "@/lib/prisma";

export async function getSessionFromCookies(): Promise<SessionClaims | null> {
  try {
    const c = await cookies();
    const demoT = c.get(SESSION_DEMO_COOKIE_NAME)?.value;
    if (demoT) {
      const d = await verifySessionToken(demoT);
      if (d?.demo) return d;
    }
    if (isSingleUserPortable()) {
      return SINGLE_USER_SESSION;
    }
    const t = c.get(SESSION_COOKIE_NAME)?.value;
    if (!t) return null;
    const m = await verifySessionToken(t);
    if (m?.demo) return null;
    if (!m?.sid) return null;
    const row = await prisma.userDeviceSession.findUnique({
      where: { id: m.sid },
      select: { userId: true, revokedAt: true, expiresAt: true },
    });
    if (!row || row.userId !== m.sub || row.revokedAt != null) return null;
    if (row.expiresAt.getTime() <= Date.now()) return null;
    return m;
  } catch {
    return null;
  }
}
