import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";
import { buildPublicWorkExampleView } from "@/lib/work-examples/public-view";
import { loadWorkExampleShowcaseBrand } from "@/lib/work-examples/showcase-brand.server";

const publicSelect = {
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
} as const;

export async function loadPublicWorkExampleShowcase(token: string) {
  const tok = String(token || "").trim();
  if (!tok) return null;

  const head = await prisma.workExample.findFirst({
    where: { shareToken: tok, deletedAt: null },
    select: { tenantId: true },
  });
  if (!head) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: head.tenantId },
    select: { id: true, name: true, slug: true },
  });
  if (!tenant) return null;

  const db = await resolveTenantPrismaClient(tenant.id);
  const row = await db.workExample.findFirst({
    where: { tenantId: tenant.id, shareToken: tok, deletedAt: null },
    select: publicSelect,
  });
  if (!row) return null;

  const slug = tenant.slug?.trim() || "lab";
  const view = buildPublicWorkExampleView(row);
  const brand = await loadWorkExampleShowcaseBrand(db, tenant.id, tenant.name);
  const logoUrl =
    brand.logoRelPath && brand.logoMime
      ? `/api/public/work-examples/${encodeURIComponent(slug)}/${encodeURIComponent(tok)}/logo`
      : null;
  return {
    tenantSlug: slug,
    token: tok,
    data: { labName: brand.labName, logoUrl, ...view },
  };
}
