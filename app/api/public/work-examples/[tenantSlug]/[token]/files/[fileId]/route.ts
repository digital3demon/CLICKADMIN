import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";
import { workExampleFileContentType } from "@/lib/work-examples/mesh-file";
import { readWorkExampleFileBytes } from "@/lib/work-examples/storage";

export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{ tenantSlug: string; token: string; fileId: string }>;
};

export async function GET(_req: Request, ctxP: Ctx) {
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
  const bytes = await readWorkExampleFileBytes(file.diskRelPath);
  if (!bytes) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": workExampleFileContentType(file.fileName, file.mime),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
