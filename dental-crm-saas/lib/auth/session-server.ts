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
    return m;
  } catch {
    return null;
  }
}
