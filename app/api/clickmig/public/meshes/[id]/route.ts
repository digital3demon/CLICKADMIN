import { NextRequest, NextResponse } from "next/server";
import {
  clickMigOptionsResponse,
  resolvePublicClickMigContext,
  withClickMigCors,
} from "@/lib/clickmig/public-api.server";
import {
  isClickMigMeshFileName,
  readClickMigFileBytes,
} from "@/lib/clickmig/storage.server";

export async function OPTIONS(req: NextRequest) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;
  return clickMigOptionsResponse(req, ctx.allowedOrigins);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;
  const { id } = await params;

  const file = await ctx.prisma.clickMigFile.findFirst({
    where: { id, tenantId: ctx.tenantId, kind: "SCAN" },
  });
  if (!file || !isClickMigMeshFileName(file.fileName)) {
    return withClickMigCors(
      req,
      ctx.allowedOrigins,
      NextResponse.json({ error: "Mesh не найден" }, { status: 404 }),
    );
  }

  const bytes = await readClickMigFileBytes(file.diskRelPath, file.data);
  if (!bytes) {
    return withClickMigCors(
      req,
      ctx.allowedOrigins,
      NextResponse.json({ error: "Файл недоступен" }, { status: 404 }),
    );
  }

  return withClickMigCors(
    req,
    ctx.allowedOrigins,
    NextResponse.json({
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      url: `/api/clickmig/public/files/${file.id}?inline=1`,
    }),
  );
}
