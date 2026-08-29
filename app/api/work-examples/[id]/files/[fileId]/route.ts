import { NextResponse } from "next/server";
import { requireWorkExamplesCtx } from "@/lib/work-examples/access.server";
import { workExampleFileContentType } from "@/lib/work-examples/mesh-file";
import { readWorkExampleFileBytes } from "@/lib/work-examples/storage";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; fileId: string }> };

export async function GET(_req: Request, ctxP: Ctx) {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { id, fileId } = await ctxP.params;
  const file = await ctx.prisma.workExampleFile.findFirst({
    where: { id: fileId, example: { id, tenantId: ctx.tenantId } },
  });
  if (!file) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const bytes = await readWorkExampleFileBytes(file.diskRelPath);
  if (!bytes) return NextResponse.json({ error: "Файл недоступен" }, { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": workExampleFileContentType(file.fileName, file.mime),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "private, max-age=120",
    },
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
