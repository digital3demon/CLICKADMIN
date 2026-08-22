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
import { VIEW_AS_ROLE_COOKIE_NAME, parseViewAsRole } from "@/lib/auth/view-as-role";
import {
  readSessionLookupCache,
  sessionLookupCacheKey,
  writeSessionLookupCache,
} from "@/lib/auth/session-lookup-cache";

export async function getSessionFromCookies(): Promise<SessionClaims | null> {
  try {
    const c = await cookies();
    const demoT = c.get(SESSION_DEMO_COOKIE_NAME)?.value;
    if (demoT) {
      const d = await verifySessionToken(demoT);
      if (d?.demo) return d;
    }
    if (isSingleUserPortable()) {
      if (process.env.NODE_ENV === "production") return null;
      return SINGLE_USER_SESSION;
    }
    const t = c.get(SESSION_COOKIE_NAME)?.value;
    if (!t) return null;
    const m = await verifySessionToken(t);
    if (m?.demo) return null;
    if (!m?.sid) return null;
    const viewAsRaw = c.get(VIEW_AS_ROLE_COOKIE_NAME)?.value ?? "";
    /* ~10 с: revoke/роль/addonKanban могут отставать; logout сбрасывает кэш. */
    const cacheKey = sessionLookupCacheKey({
      sid: m.sid,
      demo: false,
      viewAsRaw,
    });
    const cached = readSessionLookupCache<SessionClaims>(cacheKey);
    if (cached) return cached;
    const row = await prisma.userDeviceSession.findUnique({
      where: { id: m.sid },
      select: {
        userId: true,
        revokedAt: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            isActive: true,
            tenantId: true,
            tenant: {
              select: {
                plan: true,
                addonKanban: true,
              },
            },
          },
        },
      },
    });
    if (!row || row.userId !== m.sub || row.revokedAt != null) return null;
    if (row.expiresAt.getTime() <= Date.now()) return null;
    if (!row.user || row.user.isActive !== true) return null;
    const actualRole = row.user.role;
    const viewAsRole =
      actualRole === "OWNER" ? parseViewAsRole(viewAsRaw) : null;
    const session: SessionClaims = {
      sub: row.user.id,
      email: row.user.email,
      role: viewAsRole ?? actualRole,
      ...(viewAsRole ? { actualRole } : {}),
      name: row.user.displayName,
      sid: m.sid,
      tid: row.user.tenantId,
      plan: row.user.tenant?.plan,
      addonKanban: row.user.tenant?.addonKanban === true,
    };
    writeSessionLookupCache(cacheKey, session);
    return session;
  } catch {
    return null;
  }
}
