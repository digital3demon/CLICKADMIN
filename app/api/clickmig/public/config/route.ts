import { NextRequest, NextResponse } from "next/server";
import {
  clickMigOptionsResponse,
  resolvePublicClickMigContext,
  withClickMigCors,
} from "@/lib/clickmig/public-api.server";
import {
  getClickMigConfig,
  publicClickMigConfigPayload,
} from "@/lib/clickmig/config.server";

export async function OPTIONS(req: NextRequest) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;
  return clickMigOptionsResponse(req, ctx.allowedOrigins);
}

export async function GET(req: NextRequest) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;
  const { json } = await getClickMigConfig(ctx.prisma, ctx.tenantId);
  return withClickMigCors(
    req,
    ctx.allowedOrigins,
    NextResponse.json(publicClickMigConfigPayload(json)),
  );
}
