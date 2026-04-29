import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSecret, verifySecret } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { jsonResponseIfAuthSecretMissing } from "@/lib/auth/require-auth-secret";
import {
  clearDemoSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session-cookie";
import { normalizeInviteCodeInput } from "@/lib/auth/invite-code";
import { defaultHomePathForRole } from "@/lib/auth/permissions";
import { getTenantForRequest } from "@/lib/auth/tenant-for-auth-request";
import { sessionClaimsForUserId } from "@/lib/auth/session-claims-for-user";

type Body = {
  email?: string;
  code?: string;
  password?: string;
};

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
    const code = normalizeInviteCodeInput(String(body.code ?? ""));
    const password = body.password ?? "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Укажите почту" }, { status: 400 });
    }
    if (!/^[A-F0-9]{10}$/.test(code)) {
      return NextResponse.json(
        { error: "Код — 10 символов (цифры и A–F), как в приглашении" },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Пароль не короче 8 символов" },
        { status: 400 },
      );
    }

    const tenant = await getTenantForRequest(req);
    if (!tenant) {
      return NextResponse.json(
        { error: "Организация не найдена" },
        { status: 404 },
      );
    }

    const user = await prisma.user.findFirst({
      where: { email, tenantId: tenant.id },
    });
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Неверная почта или код" },
        { status: 401 },
      );
    }
    if (user.role === "OWNER") {
      return NextResponse.json(
        { error: "Владелец создаётся при первом запуске, не по коду" },
        { status: 400 },
      );
    }
    if (!user.inviteCodeHash || user.passwordHash) {
      return NextResponse.json(
        { error: "Приглашение уже использовано или пароль уже задан" },
        { status: 400 },
      );
    }

    const codeOk = await verifySecret(code, user.inviteCodeHash);
    if (!codeOk) {
      return NextResponse.json(
        { error: "Неверная почта или код" },
        { status: 401 },
      );
    }

    const passwordHash = await hashSecret(password);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        inviteCodeHash: null,
        lastLoginAt: new Date(),
      },
    });

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
    console.error(e);
    return NextResponse.json({ error: "Ошибка активации" }, { status: 500 });
  }
}
