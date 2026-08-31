import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";
import {
  convertHtmlBufferToD3d,
  persistWorkExampleD3dHtml,
} from "@/lib/work-examples/d3d-html-export.server";
import { isWorkExampleViewableHtml } from "@/lib/work-examples/mesh-file";
import { readWorkExampleFileBytes } from "@/lib/work-examples/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = {
  params: Promise<{ tenantSlug: string; token: string; fileId: string }>;
};

/** POST: публичная витрина, тот же CLI-конверт, что в CRM. */
export async function POST(_req: Request, ctxP: Ctx) {
  const { tenantSlug, token, fileId } = await ctxP.params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug: String(tenantSlug || "").trim() },
    select: { id: true },
  });
  if (!tenant) return NextResponse.json({ error: "not found" }, { status: 404 });
  const db = await resolveTenantPrismaClient(tenant.id);
  const file = await db.workExampleFile.findFirst({
    where: {
      id: fileId,
      deletedAt: null,
      example: {
        tenantId: tenant.id,
        shareToken: String(token || "").trim(),
        deletedAt: null,
      },
    },
  });
  if (!file) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!isWorkExampleViewableHtml(file.fileName)) {
    return NextResponse.json({ error: "это не HTML-сцена", code: "not_exocad_or_d3d" }, { status: 400 });
  }
  const raw = await readWorkExampleFileBytes(file.diskRelPath);
  if (!raw) return NextResponse.json({ error: "not found" }, { status: 404 });
  const converted = await convertHtmlBufferToD3d(raw, file.fileName);
  if (!converted.ok) {
    return NextResponse.json(
      { error: converted.error, code: converted.code },
      { status: converted.status },
    );
  }
  if (converted.converted || converted.bytes.length !== raw.length) {
    await persistWorkExampleD3dHtml({
      prisma: db,
      exampleId: file.exampleId,
      fileId: file.id,
      bytes: converted.bytes,
    });
  }
  return NextResponse.json({
    url: `/api/public/work-examples/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(token)}/files/${encodeURIComponent(fileId)}`,
    converted: converted.converted,
  });
}
