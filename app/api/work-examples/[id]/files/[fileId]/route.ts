import { NextResponse } from "next/server";
import { requireWorkExamplesCtx } from "@/lib/work-examples/access.server";
import { workExampleFileHttpResponse } from "@/lib/work-examples/file-http-response";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; fileId: string }> };

export async function GET(req: Request, ctxP: Ctx) {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { id, fileId } = await ctxP.params;
  const file = await ctx.prisma.workExampleFile.findFirst({
    where: { id: fileId, example: { id, tenantId: ctx.tenantId } },
  });
  if (!file) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  return workExampleFileHttpResponse({
    reqUrl: req.url,
    diskRelPath: file.diskRelPath,
    fileName: file.fileName,
    mime: file.mime,
    cacheControl: "private, max-age=120",
    previewCacheControl: "private, max-age=86400",
  });
}

export async function DELETE(_req: Request, ctxP: Ctx) {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { id, fileId } = await ctxP.params;
  const file = await ctx.prisma.workExampleFile.findFirst({
    where: {
      id: fileId,
      deletedAt: null,
      example: { id, tenantId: ctx.tenantId, deletedAt: null },
    },
  });
  if (!file) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  await ctx.prisma.workExampleFile.update({
    where: { id: file.id },
    data: {
      deletedAt: new Date(),
      deletedByUserId: ctx.actorUserId,
      deletedByLabel: ctx.actorLabel,
    },
  });
  return NextResponse.json({ ok: true });
}
