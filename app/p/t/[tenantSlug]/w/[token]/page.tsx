import { notFound } from "next/navigation";
import { PublicWorkExampleShowcase } from "@/components/work-examples/PublicWorkExampleShowcase";
import { prisma } from "@/lib/prisma";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";
import { buildPublicWorkExampleView } from "@/lib/work-examples/public-view";

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
  return (
    <PublicWorkExampleShowcase
      tenantSlug={slug}
      token={tok}
      data={{ labName: tenant.name || "Лаборатория", ...view }}
    />
  );
}
