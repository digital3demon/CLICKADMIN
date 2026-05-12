import "server-only";

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";

export type StickerOrderResolve =
  | {
      ok: true;
      tenantId: string;
      tenantSlug: string;
      orderId: string;
      ordersDb: PrismaClient;
    }
  | { ok: false };

/**
 * По slug организации и токену с этикетки находит наряд.
 * Заказы читаются из БД тенанта (`resolveTenantPrismaClient`).
 */
export async function resolveStickerOrderBySlugAndToken(
  tenantSlug: string,
  token: string,
): Promise<StickerOrderResolve> {
  const slug = String(tenantSlug || "").trim();
  const tok = String(token || "").trim();
  if (!slug || !tok) return { ok: false };

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });
  if (!tenant) return { ok: false };

  const ordersDb = await resolveTenantPrismaClient(tenant.id);
  const order = await ordersDb.order.findFirst({
    where: { tenantId: tenant.id, stickerPublicToken: tok },
    select: { id: true },
  });
  if (!order) return { ok: false };

  return {
    ok: true,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    orderId: order.id,
    ordersDb,
  };
}
