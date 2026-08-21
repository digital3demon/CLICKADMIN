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
import { DEFAULT_TENANT_ID } from "@/lib/tenant-constants";
import {
  consumeDemoAccessCodeOrThrow,
  DemoAccessCodeError,
} from "@/lib/demo-access-consume";

export const dynamic = "force-dynamic";

/**
 * Вход в общее демо по одноразовому коду (без тенанта).
 * Код сгорает при первом успешном входе и привязывается к sid сессии (одна машина).
 *
 * По умолчанию демо-БД каждый раз пересоздаётся из сида. Чтобы сохранять правки в демо между
 * заходами, задайте в .env: `DEMO_RESEED_ON_START=0` — тогда сид выполнится только при пустой демо-БД.
 */
export async function POST(req: Request) {
  if (isSingleUserPortable()) {
    return NextResponse.json(
      { error: "Демо недоступно в однопользовательской сборке" },
      { status: 403 },
    );
  }
  const secretMissing = jsonResponseIfAuthSecretMissing();
  if (secretMissing) return secretMissing;

  let body: { code?: unknown } = {};
  try {
    body = (await req.json()) as { code?: unknown };
  } catch {
    body = {};
  }
  const codePlain = typeof body.code === "string" ? body.code : "";

  let sid: string;
  try {
    ({ sid } = await consumeDemoAccessCodeOrThrow({
      codePlain,
      headers: req.headers,
    }));
  } catch (e) {
    if (e instanceof DemoAccessCodeError) {
      const status =
        e.code === "MISSING" || e.code === "INVALID" ? 400 : 409;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    throw e;
  }

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
    tid: DEFAULT_TENANT_ID,
    sid,
  });

  const res = NextResponse.json({ ok: true, next: "/orders" });
  clearSessionCookie(res);
  setDemoSessionCookie(res, token);
  return res;
}
