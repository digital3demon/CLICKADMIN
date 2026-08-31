import { NextResponse } from "next/server";
import { exampleSelect, requireWorkExamplesCtx } from "@/lib/work-examples/access.server";
import {
  CloudFolderImportError,
  importWorkExampleCloudFolder,
} from "@/lib/work-examples/cloud-folder-import.server";
import { serializeWorkExample } from "@/lib/work-examples/serialize";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

type Ctx = { params: Promise<{ id: string }> };

/** POST JSON { folderUrl }: копии фото с Яндекс Диска / Google Drive. SQLITE_BUSY — Prisma retry. */
export async function POST(req: Request, ctxP: Ctx) {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { id } = await ctxP.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const o = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
  const folderUrl = typeof o.folderUrl === "string" ? o.folderUrl : "";
  try {
    const result = await importWorkExampleCloudFolder({
      prisma: ctx.prisma,
      tenantId: ctx.tenantId,
      exampleId: id,
      folderUrl,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof CloudFolderImportError) {
      const row = await ctx.prisma.workExample.findFirst({
        where: { id, tenantId: ctx.tenantId },
        select: exampleSelect,
      });
      return NextResponse.json(
        {
          error: e.message,
          item: row ? serializeWorkExample(row, { includeInternal: true }) : undefined,
        },
        { status: e.status },
      );
    }
    const details = e instanceof Error ? e.message : String(e);
    console.error(
      JSON.stringify({
        evt: "work_example_cloud_import_fail",
        details: details.slice(0, 240),
      }),
    );
    return NextResponse.json(
      { error: "Не удалось забрать фото из облака", details: details.slice(0, 240) },
      { status: 500 },
    );
  }
}
