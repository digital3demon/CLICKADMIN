import { NextRequest, NextResponse } from "next/server";
import { verifySecret } from "@/lib/auth/password";
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

  const body = (await req.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  const client = await ctx.prisma.clickMigClient.findUnique({
    where: { tenantId_email: { tenantId: ctx.tenantId, email } },
  });
  if (!client || !(await verifySecret(password, client.passwordHash))) {
    return withClickMigCors(
      req,
      ctx.allowedOrigins,
      NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 }),
    );
  }

  const token = await signClickMigClientSession({
    clientId: client.id,
    tenantId: ctx.tenantId,
    email: client.email,
  });

  const res = withClickMigCors(
    req,
    ctx.allowedOrigins,
    NextResponse.json({
      ok: true,
      clientId: client.id,
      email: client.email,
      fullName: client.fullName,
    }),
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
