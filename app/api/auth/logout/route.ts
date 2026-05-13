import { NextResponse } from "next/server";
import {
  clearDemoSessionCookie,
  clearSessionCookie,
  clearViewAsRoleCookie,
} from "@/lib/auth/session-cookie";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";
import { revokeUserDeviceSessionBySid } from "@/lib/auth/device-session";

export async function POST() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const claims = await verifySessionToken(token);
    if (claims?.sid) {
      await revokeUserDeviceSessionBySid(claims.sid, claims.sub).catch(() => {});
    }
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  clearDemoSessionCookie(res);
  clearViewAsRoleCookie(res);
  return res;
}
