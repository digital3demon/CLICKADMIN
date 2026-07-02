import { NextRequest, NextResponse } from "next/server";
import { hashSecret, verifySecret } from "@/lib/auth/password";
import {
  clickMigClientCookieName,
  signClickMigClientSession,
} from "@/lib/clickmig/public-auth.server";
import {
  clickMigOptionsResponse,
  resolvePublicClickMigContext,
  withClickMigCors,
} from "@/lib/clickmig/public-api.server";

export async function OPTIONS(req: NextRequest) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;
  return clickMigOptionsResponse(req, ctx.allowedOrigins);
}

export async function POST(req: NextRequest) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;

  const body = (await req.json()) as {
    email?: string;
    password?: string;
    fullName?: string;
    phone?: string;
  };

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const fullName = body.fullName?.trim() ?? "";

  if (!email || !password || password.length < 8 || !fullName) {
    return withClickMigCors(
      req,
      ctx.allowedOrigins,
      NextResponse.json({ error: "Некорректные данные регистрации" }, { status: 400 }),
    );
  }

  const existing = await ctx.prisma.clickMigClient.findUnique({
    where: { tenantId_email: { tenantId: ctx.tenantId, email } },
  });
  if (existing) {
    return withClickMigCors(
      req,
      ctx.allowedOrigins,
      NextResponse.json({ error: "Email уже зарегистрирован" }, { status: 409 }),
    );
  }

  const client = await ctx.prisma.clickMigClient.create({
    data: {
      tenantId: ctx.tenantId,
      email,
      passwordHash: await hashSecret(password),
      fullName,
      phone: body.phone?.trim() || null,
    },
  });

  const token = await signClickMigClientSession({
    clientId: client.id,
    tenantId: ctx.tenantId,
    email,
  });

  const res = withClickMigCors(
    req,
    ctx.allowedOrigins,
    NextResponse.json({ ok: true, clientId: client.id, email, fullName }),
  );
  res.cookies.set(clickMigClientCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
