import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySecret } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { jsonResponseIfAuthSecretMissing } from "@/lib/auth/require-auth-secret";
import {
  clearDemoSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session-cookie";
import { defaultHomePathForRole } from "@/lib/auth/permissions";
import { getTenantForRequest } from "@/lib/auth/tenant-for-auth-request";
import {
  SESSION_MISSING_TENANT_ERROR,
  sessionClaimsForUserId,
} from "@/lib/auth/session-claims-for-user";

type Body = { email?: string; password?: string };

function normEmail(v: string): string {
  return v.trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const secretMissing = jsonResponseIfAuthSecretMissing();
    if (secretMissing) return secretMissing;

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
    }

    const email = normEmail(body.email ?? "");
    const password = body.password ?? "";
    if (!email || !password) {
      return NextResponse.json(
        { error: "Укажите почту и пароль" },
        { status: 400 },
      );
    }

    const tenant = await getTenantForRequest(req);
    if (!tenant) {
      return NextResponse.json(
        { error: "Организация не найдена. Проверьте адрес (поддомен) или обратитесь в поддержку." },
        { status: 404 },
      );
    }

    const user = await prisma.user.findFirst({
      where: { email, tenantId: tenant.id },
    });
    if (!user || !user.isActive || !user.passwordHash) {
      return NextResponse.json(
        { error: "Неверная почта или пароль" },
        { status: 401 },
      );
    }

    const ok = await verifySecret(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Неверная почта или пароль" },
        { status: 401 },
      );
    }

    // lastLoginAt — вспомогательное поле: не блокируем вход, если SQLite временно занята.
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch (e) {
      console.warn("[auth/login-owner] skip lastLoginAt update:", e);
    }

    const claims = await sessionClaimsForUserId(user.id);
    const token = await signSessionToken(claims);
    const res = NextResponse.json({
      ok: true,
      homePath: defaultHomePathForRole(user.role),
    });
    setSessionCookie(res, token);
    clearDemoSessionCookie(res);
    return res;
  } catch (e) {
    console.error("[auth/login-owner]", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2021") {
        return NextResponse.json(
          {
            error:
              "В базе не хватает таблиц (например Tenant). На сервере выполните: npx prisma migrate deploy",
          },
          { status: 500 },
        );
      }
    }
    if (
      e instanceof Error &&
      (e.message === SESSION_MISSING_TENANT_ERROR ||
        e.message.includes(SESSION_MISSING_TENANT_ERROR))
    ) {
      return NextResponse.json(
        {
          error:
            "У пользователя в базе нет связанной организации (tenantId). Проверьте миграции и таблицу Tenant, при необходимости запустите node scripts/backfill-tenant-ids.cjs",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Ошибка входа" }, { status: 500 });
  }
}
