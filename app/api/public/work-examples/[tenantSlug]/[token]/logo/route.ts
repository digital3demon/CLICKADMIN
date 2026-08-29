import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";
import { loadWorkExampleShowcaseBrand } from "@/lib/work-examples/showcase-brand.server";
import { readWorkExampleFileBytes } from "@/lib/work-examples/storage";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantSlug: string; token: string }> };

export async function GET(_req: Request, ctxP: Ctx) {
  const { tenantSlug, token } = await ctxP.params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug: String(tenantSlug || "").trim() },
    select: { id: true, name: true },
  });
  if (!tenant) return NextResponse.json({ error: "not found" }, { status: 404 });
  const db = await resolveTenantPrismaClient(tenant.id);
  const example = await db.workExample.findFirst({
    where: {
      tenantId: tenant.id,
      shareToken: String(token || "").trim(),
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!example) return NextResponse.json({ error: "not found" }, { status: 404 });
  const brand = await loadWorkExampleShowcaseBrand(db, tenant.id, tenant.name);
  if (!brand.logoRelPath || !brand.logoMime) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const bytes = await readWorkExampleFileBytes(brand.logoRelPath);
  if (!bytes) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": brand.logoMime,
      "Cache-Control": "public, max-age=300",
    },
  });
}
