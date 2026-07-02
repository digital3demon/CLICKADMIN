import { NextRequest, NextResponse } from "next/server";
import {
  clickMigOptionsResponse,
  getOptionalClientSession,
  resolvePublicClickMigContext,
  withClickMigCors,
} from "@/lib/clickmig/public-api.server";

export async function OPTIONS(req: NextRequest) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;
  return clickMigOptionsResponse(req, ctx.allowedOrigins);
}

export async function GET(req: NextRequest) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;
  const session = await getOptionalClientSession(req);
  if (!session || session.tenantId !== ctx.tenantId) {
    return withClickMigCors(
      req,
      ctx.allowedOrigins,
      NextResponse.json({ error: "Требуется вход" }, { status: 401 }),
    );
  }
  const clinics = await ctx.prisma.clickMigClientClinic.findMany({
    where: { clientId: session.clientId },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
  });
  return withClickMigCors(req, ctx.allowedOrigins, NextResponse.json({ clinics }));
}

export async function POST(req: NextRequest) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;
  const session = await getOptionalClientSession(req);
  if (!session || session.tenantId !== ctx.tenantId) {
    return withClickMigCors(
      req,
      ctx.allowedOrigins,
      NextResponse.json({ error: "Требуется вход" }, { status: 401 }),
    );
  }
  const body = (await req.json()) as {
    name?: string;
    address?: string;
    isDefault?: boolean;
  };
  const name = body.name?.trim() ?? "";
  if (!name) {
    return withClickMigCors(
      req,
      ctx.allowedOrigins,
      NextResponse.json({ error: "Укажите название клиники" }, { status: 400 }),
    );
  }
  if (body.isDefault) {
    await ctx.prisma.clickMigClientClinic.updateMany({
      where: { clientId: session.clientId },
      data: { isDefault: false },
    });
  }
  const clinic = await ctx.prisma.clickMigClientClinic.create({
    data: {
      clientId: session.clientId,
      name,
      address: body.address?.trim() || null,
      isDefault: body.isDefault === true,
    },
  });
  return withClickMigCors(req, ctx.allowedOrigins, NextResponse.json({ clinic }));
}
