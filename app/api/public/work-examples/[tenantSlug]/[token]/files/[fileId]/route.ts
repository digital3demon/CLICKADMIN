import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";
import { workExampleFileHttpResponse } from "@/lib/work-examples/file-http-response";

export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{ tenantSlug: string; token: string; fileId: string }>;
};

export async function GET(req: Request, ctxP: Ctx) {
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
  const res = await workExampleFileHttpResponse({
    reqUrl: req.url,
    diskRelPath: file.diskRelPath,
    fileName: file.fileName,
    mime: file.mime,
    cacheControl: "public, max-age=300",
    previewCacheControl: "public, max-age=86400",
  });
  if (res.status === 404) return NextResponse.json({ error: "not found" }, { status: 404 });
  return res;
}
