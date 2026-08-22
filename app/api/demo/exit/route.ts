import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_DEMO_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/jwt";
import {
  clearDemoSessionCookie,
  clearSessionCookie,
  clearViewAsRoleCookie,
} from "@/lib/auth/session-cookie";
import { isSingleUserPortable } from "@/lib/auth/single-user";

export const dynamic = "force-dynamic";

/**
 * Выход из демо: только сброс cookie (быстро).
 * Reseed демо-БД — на следующем /api/demo/start, не здесь:
 * раньше await resetAndSeed делал выход на десятки секунд.
 */
export async function POST() {
  if (isSingleUserPortable()) {
    return NextResponse.json({ error: "Недоступно" }, { status: 403 });
  }

  const jar = await cookies();
  const demoT = jar.get(SESSION_DEMO_COOKIE_NAME)?.value;
  if (demoT) {
    await verifySessionToken(demoT).catch(() => null);
  }

  const res = NextResponse.json({ ok: true, next: "/login" });
  clearDemoSessionCookie(res);
  clearSessionCookie(res);
  clearViewAsRoleCookie(res);
  return res;
}
