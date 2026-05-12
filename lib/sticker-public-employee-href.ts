import "server-only";

import type { SessionClaims } from "@/lib/auth/jwt";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { getPrisma } from "@/lib/get-prisma";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { orderPathById } from "@/lib/order-public-ref";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";
import { stickerPublicStaffPath } from "@/lib/sticker-public-path";

/**
 * Куда вести с публичной витрины стикера по кнопке «Для сотрудников»:
 * сессия своего тенанта + модули → наряд или канбан; иначе вход с возвратом на /staff или сам /staff.
 */
export async function resolveStickerEmployeesHref(opts: {
  session: SessionClaims | null;
  stickerTenantId: string;
  orderId: string;
  tenantSlug: string;
  token: string;
}): Promise<string> {
  const staff = stickerPublicStaffPath(opts.tenantSlug, opts.token);
  const loginNext = `/login?next=${encodeURIComponent(staff)}`;

  const s = opts.session;
  if (!s?.sub || s.demo) return loginNext;

  if (isSingleUserPortable() && s.tid === opts.stickerTenantId) {
    return orderPathById(opts.orderId);
  }

  if (s.tid !== opts.stickerTenantId) return loginNext;

  const prisma = await getPrisma();
  const user = await prisma.user.findFirst({
    where: { id: s.sub, tenantId: opts.stickerTenantId, isActive: true },
    select: { role: true },
  });
  if (!user) return loginNext;

  const access = await getEffectiveModuleAccess(opts.stickerTenantId, user.role);
  if (access.ORDERS === true) {
    return orderPathById(opts.orderId);
  }
  if (access.KANBAN === true) {
    return kanbanOrderDeepLinkPath(opts.orderId);
  }
  return staff;
}
