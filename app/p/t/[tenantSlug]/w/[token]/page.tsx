import { notFound } from "next/navigation";
import { PublicWorkExampleShowcase } from "@/components/work-examples/PublicWorkExampleShowcase";
import { prisma } from "@/lib/prisma";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";
import { buildPublicWorkExampleView } from "@/lib/work-examples/public-view";
import { loadWorkExampleShowcaseBrand } from "@/lib/work-examples/showcase-brand.server";

export const dynamic = "force-dynamic";

export default async function PublicWorkExamplePage({
  params,
}: {
  params: Promise<{ tenantSlug: string; token: string }>;
}) {
  const { tenantSlug, token } = await params;
  const slug = String(tenantSlug || "").trim();
  const tok = String(token || "").trim();
  if (!slug || !tok) notFound();

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!tenant) notFound();

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
  if (!row) notFound();

  const view = buildPublicWorkExampleView(row);
  const brand = await loadWorkExampleShowcaseBrand(db, tenant.id, tenant.name);
  const logoUrl =
    brand.logoRelPath && brand.logoMime
      ? `/api/public/work-examples/${encodeURIComponent(slug)}/${encodeURIComponent(tok)}/logo`
      : null;
  return (
    <PublicWorkExampleShowcase
      tenantSlug={slug}
      token={tok}
      data={{ labName: brand.labName, logoUrl, ...view }}
    />
  );
}
