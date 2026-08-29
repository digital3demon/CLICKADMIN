import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";
import { buildPublicWorkExampleView } from "@/lib/work-examples/public-view";
import { loadWorkExampleShowcaseBrand } from "@/lib/work-examples/showcase-brand.server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ tenantSlug: string; token: string }> };

export async function GET(_req: Request, ctxP: Ctx) {
  const { tenantSlug, token } = await ctxP.params;
  const slug = String(tenantSlug || "").trim();
  const tok = String(token || "").trim();
  if (!slug || !tok) return NextResponse.json({ error: "not found" }, { status: 404 });
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!tenant) return NextResponse.json({ error: "not found" }, { status: 404 });
  const db = await resolveTenantPrismaClient(tenant.id);
  const row = await db.workExample.findFirst({
    where: { tenantId: tenant.id, shareToken: tok, deletedAt: null },
    select: {
      title: true,
      cardTypes: true,
      compositionSnapshot: true,
      cloudUrl: true,
      cloudUrlDeletedAt: true,
      technicianNotes: true,
      doctorComments: true,
      files: {
        select: {
          id: true,
          kind: true,
          fileName: true,
          mime: true,
          sizeBytes: true,
          deletedAt: true,
        },
      },
    },
  });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  const view = buildPublicWorkExampleView(row);
  const brand = await loadWorkExampleShowcaseBrand(db, tenant.id, tenant.name);
  return NextResponse.json({
    labName: brand.labName,
    logoUrl:
      brand.logoRelPath && brand.logoMime
        ? `/api/public/work-examples/${encodeURIComponent(slug)}/${encodeURIComponent(tok)}/logo`
        : null,
    ...view,
  });
}
