import { NextResponse } from "next/server";
import { jsonResponseIfAuthSecretMissing } from "@/lib/auth/require-auth-secret";
import { signSessionToken } from "@/lib/auth/jwt";
import {
  clearSessionCookie,
  setDemoSessionCookie,
} from "@/lib/auth/session-cookie";
import { resetAndSeedDemoDatabase } from "@/lib/demo-reset";
import { isDemoPersistentStorage } from "@/lib/demo-reseed-policy";
import { isDemoDatabaseSeeded, OWNER_EMAIL, OWNER_ID } from "@/lib/demo-seed";
import { getDemoPrisma } from "@/lib/prisma-demo";
import { isSingleUserPortable } from "@/lib/auth/single-user";

export const dynamic = "force-dynamic";

/**
 * Вход в демо как условный владелец: отдельная БД, отдельная cookie; боевая сессия сбрасывается.
 *
 * По умолчанию демо-БД каждый раз пересоздаётся из сида. Чтобы сохранять правки в демо между
 * заходами, задайте в .env: `DEMO_RESEED_ON_START=0` — тогда сид выполнится только при пустой демо-БД.
 */
export async function POST() {
  if (isSingleUserPortable()) {
    return NextResponse.json(
      { error: "Демо недоступно в однопользовательской сборке" },
      { status: 403 },
    );
  }
  const secretMissing = jsonResponseIfAuthSecretMissing();
  if (secretMissing) return secretMissing;

  try {
    if (!isDemoPersistentStorage()) {
      await resetAndSeedDemoDatabase();
    } else {
      const db = getDemoPrisma();
      if (!(await isDemoDatabaseSeeded(db))) {
        await resetAndSeedDemoDatabase();
      }
    }
  } catch (e) {
    console.error("[demo/start]", e);
    const detail =
      e instanceof Error
        ? e.message.replace(/\s+/g, " ").trim().slice(0, 900)
        : String(e).slice(0, 900);
    return NextResponse.json(
      {
        error: "Не удалось подготовить демо-БД",
        detail,
      },
      { status: 500 },
    );
  }

  const token = await signSessionToken({
    sub: OWNER_ID,
    email: OWNER_EMAIL,
    role: "OWNER",
    name: "Демо — владелец",
    demo: true,
  });

  const res = NextResponse.json({ ok: true, next: "/orders" });
  clearSessionCookie(res);
  setDemoSessionCookie(res, token);
  return res;
}
