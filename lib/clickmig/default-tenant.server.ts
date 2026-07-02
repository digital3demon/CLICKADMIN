import "server-only";

import type { PrismaClient } from "@prisma/client";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant-constants";

/** Единственная организация лаба для публичного КликМиг без API key (same-origin / form-поддомен). */
export async function resolveDefaultClickMigTenantId(
  prisma: PrismaClient,
): Promise<string | null> {
  const envId = process.env.CLICKMIG_TENANT_ID?.trim();
  if (envId) return envId;
  const slug =
    process.env.CRM_DEFAULT_TENANT_SLUG?.trim() || DEFAULT_TENANT_SLUG;
  const row = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  return row?.id ?? null;
}
