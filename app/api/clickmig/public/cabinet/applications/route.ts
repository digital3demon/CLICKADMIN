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

  const apps = await ctx.prisma.clickMigApplication.findMany({
    where: { tenantId: ctx.tenantId, clientId: session.clientId },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { status: true, kanbanColumnId: true } } },
  });

  return withClickMigCors(
    req,
    ctx.allowedOrigins,
    NextResponse.json({
      applications: apps.map((a) => ({
        id: a.id,
        publicNumber: a.publicNumber,
        status: a.status,
        patientName: a.patientName,
        createdAt: a.createdAt.toISOString(),
        orderStatus: a.order?.status ?? null,
        kanbanColumnId: a.order?.kanbanColumnId ?? null,
      })),
    }),
  );
}
