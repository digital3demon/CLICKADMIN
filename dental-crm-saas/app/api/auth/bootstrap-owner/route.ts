import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSecret } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { jsonResponseIfAuthSecretMissing } from "@/lib/auth/require-auth-secret";
import {
  clearDemoSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session-cookie";
import { tenantSlugFromHostHeader } from "@/lib/tenant-slug";
import { sessionClaimsForUserId } from "@/lib/auth/session-claims-for-user";

type Body = {
  email?: string;
  displayName?: string;
  password?: string;
};

function normEmail(v: string): string {
  return v.trim().toLowerCase();
}

/** Один раз при пустой базе: создать владельца и выдать сессию. */
export async function POST(req: Request) {
  try {
    const secretMissing = jsonResponseIfAuthSecretMissing();
    if (secretMissing) return secretMissing;

    const n = await prisma.user.count();
    if (n > 0) {
      return NextResponse.json(
        { error: "Пользователи уже созданы. Вход через почту и пароль." },
        { status: 403 },
      );
    }

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
    }

    const email = normEmail(body.email ?? "");
    const displayName = (body.displayName ?? "").trim();
    const password = body.password ?? "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Укажите корректную почту" }, { status: 400 });
    }
    if (!displayName) {
      return NextResponse.json({ error: "Укажите ФИО" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Пароль не короче 8 символов" },
        { status: 400 },
      );
    }

    const host =
      req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const slug = tenantSlugFromHostHeader(host);
    const tenant = await prisma.tenant.upsert({
      where: { slug },
      create: {
        slug,
        name: "Организация",
        plan: "ULTRA",
        addonKanban: true,
      },
      update: {},
    });

    const passwordHash = await hashSecret(password);
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        displayName,
        role: "OWNER",
        passwordHash,
      },
    });

    const claims = await sessionClaimsForUserId(user.id);
    const token = await signSessionToken(claims);
    const res = NextResponse.json({ ok: true, userId: user.id });
    setSessionCookie(res, token);
    clearDemoSessionCookie(res);
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось создать владельца" },
      { status: 500 },
    );
  }
}
