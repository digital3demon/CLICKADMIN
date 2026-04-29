import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_DEMO_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/jwt";
import { clearDemoSessionCookie } from "@/lib/auth/session-cookie";
import { isDemoPersistentStorage } from "@/lib/demo-reseed-policy";
import { resetAndSeedDemoDatabase } from "@/lib/demo-reset";
import { isSingleUserPortable } from "@/lib/auth/single-user";

export const dynamic = "force-dynamic";

/** Выход из демо: очистка cookie; при обычном режиме — ещё и сброс демо-БД к сиду. */
export async function POST() {
  if (isSingleUserPortable()) {
    return NextResponse.json({ error: "Недоступно" }, { status: 403 });
  }

  const jar = await cookies();
  const demoT = jar.get(SESSION_DEMO_COOKIE_NAME)?.value;
  const session = demoT ? await verifySessionToken(demoT) : null;
  if (!session?.demo) {
    return NextResponse.json({ error: "Нет демо-сессии" }, { status: 401 });
  }

  if (!isDemoPersistentStorage()) {
    await resetAndSeedDemoDatabase();
  }

  const res = NextResponse.json({ ok: true, next: "/login" });
  clearDemoSessionCookie(res);
  return res;
}
