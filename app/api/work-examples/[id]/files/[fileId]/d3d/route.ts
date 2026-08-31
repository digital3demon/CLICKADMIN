import { NextResponse } from "next/server";
import { requireWorkExamplesCtx } from "@/lib/work-examples/access.server";
import {
  convertHtmlBufferToD3d,
  persistWorkExampleD3dHtml,
} from "@/lib/work-examples/d3d-html-export.server";
import { isWorkExampleViewableHtml } from "@/lib/work-examples/mesh-file";
import { readWorkExampleFileBytes } from "@/lib/work-examples/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string; fileId: string }> };

/**
 * POST: Exocad HTML → D3D через CLI, пишем поверх файла.
 * Upload: лимит 25 МБ уже на диске. SQLITE_BUSY — Prisma retry.
 */
export async function POST(_req: Request, ctxP: Ctx) {
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
  if (!isWorkExampleViewableHtml(file.fileName)) {
    return NextResponse.json({ error: "это не HTML-сцена", code: "not_exocad_or_d3d" }, { status: 400 });
  }
  const raw = await readWorkExampleFileBytes(file.diskRelPath);
  if (!raw) return NextResponse.json({ error: "Файл недоступен" }, { status: 404 });
  const converted = await convertHtmlBufferToD3d(raw, file.fileName);
  if (!converted.ok) {
    return NextResponse.json(
      { error: converted.error, code: converted.code },
      { status: converted.status },
    );
  }
  if (converted.converted || converted.bytes.length !== raw.length) {
    await persistWorkExampleD3dHtml({
      prisma: ctx.prisma,
      exampleId: file.exampleId,
      fileId: file.id,
      bytes: converted.bytes,
    });
  }
  return NextResponse.json({
    url: `/api/work-examples/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}`,
    converted: converted.converted,
  });
}
