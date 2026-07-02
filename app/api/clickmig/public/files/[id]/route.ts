import { NextRequest, NextResponse } from "next/server";
import {
  clickMigOptionsResponse,
  resolvePublicClickMigContext,
  withClickMigCors,
} from "@/lib/clickmig/public-api.server";
import { readClickMigFileBytes } from "@/lib/clickmig/storage.server";

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
    where: { id, tenantId: ctx.tenantId },
  });
  if (!file) {
    return withClickMigCors(
      req,
      ctx.allowedOrigins,
      NextResponse.json({ error: "Не найдено" }, { status: 404 }),
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

  const inline = req.nextUrl.searchParams.get("inline") === "1";
  return withClickMigCors(
    req,
    ctx.allowedOrigins,
    new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(file.fileName)}"`,
        "Content-Length": String(bytes.length),
      },
    }),
  );
}
