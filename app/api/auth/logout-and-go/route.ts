import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session-cookie";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";
import { revokeUserDeviceSessionBySid } from "@/lib/auth/device-session";

/** Сброс cookie и редирект (для принудительного выхода при отключении учётки). */
export async function GET(req: Request) {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const claims = await verifySessionToken(token);
    if (claims?.sid) {
      await revokeUserDeviceSessionBySid(claims.sid, claims.sub).catch(() => {});
    }
  }
  const url = new URL(req.url);
  const nextRaw = url.searchParams.get("next") ?? "/login";
  const nextPath = nextRaw.startsWith("/") ? nextRaw : "/login";
  /** Относительный Location — иначе за nginx в Location попадает 127.0.0.1 / localhost:PORT. */
  const res = new NextResponse(null, {
    status: 307,
    headers: { Location: nextPath },
  });
  clearSessionCookie(res);
  return res;
}
