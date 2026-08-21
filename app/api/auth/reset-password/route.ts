import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSecret, verifySecret } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { jsonResponseIfAuthSecretMissing } from "@/lib/auth/require-auth-secret";
import {
  clearDemoSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session-cookie";
import { defaultHomePathForRole } from "@/lib/auth/permissions";
import { getTenantForRequest } from "@/lib/auth/tenant-for-auth-request";
import { sessionClaimsForUserId } from "@/lib/auth/session-claims-for-user";
import {
  DeviceLimitReachedError,
  issueUserDeviceSessionOrThrow,
} from "@/lib/auth/device-session";
import {
  isPasswordResetCodeFormat,
  isPasswordResetExpired,
  normalizePasswordResetCodeInput,
} from "@/lib/auth/password-reset";
import { jsonIfAuthLoginRateLimited } from "@/lib/auth/login-rate-limit";

type Body = {
  email?: string;
  code?: string;
  password?: string;
};

function normEmail(v: string): string {
  return v.trim().toLowerCase();
}

const GENERIC_FAIL = "Неверная почта или код";

async function loadResetUser(req: Request, email: string, code: string) {
  const tenant = await getTenantForRequest(req);
  if (!tenant) return { error: "Организация не найдена" as const, status: 404 };
  const user = await prisma.user.findFirst({
    where: { email, tenantId: tenant.id },
    select: {
      id: true,
      tenantId: true,
      role: true,
      isActive: true,
      passwordHash: true,
      passwordResetCodeHash: true,
      passwordResetExpiresAt: true,
    },
  });
  if (!user || !user.isActive || !user.passwordHash || !user.passwordResetCodeHash) {
    return { error: GENERIC_FAIL, status: 401 };
  }
  if (isPasswordResetExpired(user.passwordResetExpiresAt)) {
    return { error: "Код истек. Попросите владельца сгенерировать новый.", status: 401 };
  }
  const codeOk = await verifySecret(code, user.passwordResetCodeHash);
  if (!codeOk) {
    return { error: GENERIC_FAIL, status: 401 };
  }
  return { user };
}

/**
 * POST /api/auth/reset-password
 * Без password — проверка кода. С password — новый пароль и вход.
 */
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
    const code = normalizePasswordResetCodeInput(String(body.code ?? ""));
    const password = body.password ?? "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Укажите почту" }, { status: 400 });
    }
    const limited = jsonIfAuthLoginRateLimited(req, email);
    if (limited) return limited;
    if (!isPasswordResetCodeFormat(code)) {
      return NextResponse.json(
        { error: "Код — 10 символов (цифры и A–F), как выдал владелец" },
        { status: 400 },
      );
    }

    const loaded = await loadResetUser(req, email, code);
    if ("error" in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status });
    }

    if (!password) {
      return NextResponse.json({ ok: true, next: "set-password" });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Пароль не короче 8 символов" },
        { status: 400 },
      );
    }

    const passwordHash = await hashSecret(password);
    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: loaded.user.id },
        data: {
          passwordHash,
          passwordResetCodeHash: null,
          passwordResetExpiresAt: null,
          lastLoginAt: now,
        },
      }),
      prisma.userDeviceSession.updateMany({
        where: { userId: loaded.user.id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    let sid: string;
    try {
      const issued = await issueUserDeviceSessionOrThrow({
        userId: loaded.user.id,
        tenantId: loaded.user.tenantId,
        headers: req.headers,
      });
      sid = issued.sid;
    } catch (e) {
      if (e instanceof DeviceLimitReachedError) {
        return NextResponse.json(
          {
            error:
              "Достигнут лимит устройств для одного пользователя, выйдите с другого устройства",
          },
          { status: 409 },
        );
      }
      throw e;
    }

    const claims = await sessionClaimsForUserId(loaded.user.id);
    const token = await signSessionToken({ ...claims, sid });
    const res = NextResponse.json({
      ok: true,
      homePath: defaultHomePathForRole(loaded.user.role),
    });
    setSessionCookie(res, token);
    clearDemoSessionCookie(res);
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Не удалось сменить пароль" }, { status: 500 });
  }
}
