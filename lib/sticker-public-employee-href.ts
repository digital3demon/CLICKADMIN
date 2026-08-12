import "server-only";

import type { SessionClaims } from "@/lib/auth/jwt";
import { canEditOrders } from "@/lib/auth/permissions";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { getPrisma } from "@/lib/get-prisma";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { orderPathById } from "@/lib/order-public-ref";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";
import { stickerPublicStaffPath } from "@/lib/sticker-public-path";

/**
 * Сессия сотрудника этой лаборатории в браузере (не демо).
 * Нужна, чтобы раскрыть меню «Для сотрудников» на публичной QR-витрине.
 */
export async function isStickerStaffSessionUnlocked(opts: {
  session: SessionClaims | null;
  stickerTenantId: string;
}): Promise<boolean> {
  const s = opts.session;
  if (!s?.sub || s.demo) return false;

  if (isSingleUserPortable() && s.tid === opts.stickerTenantId) {
    return true;
  }

  if (s.tid !== opts.stickerTenantId) return false;

  const prisma = await getPrisma();
  const user = await prisma.user.findFirst({
    where: { id: s.sub, tenantId: opts.stickerTenantId, isActive: true },
    select: { id: true },
  });
  return Boolean(user);
}

/**
 * Отметка «Работа отправлена» с QR — те же права, что PATCH наряда (`canEditOrders`).
 */
export async function canMarkWorkSentOnStickerHub(opts: {
  session: SessionClaims | null;
  stickerTenantId: string;
}): Promise<boolean> {
  const unlocked = await isStickerStaffSessionUnlocked(opts);
  if (!unlocked || !opts.session) return false;
  const access = await getEffectiveModuleAccess(
    opts.stickerTenantId,
    opts.session.role,
  );
  return canEditOrders(opts.session.role, access);
}

/** Перенос по колонкам с QR-витрины — модуль KANBAN_MOVE_COLUMNS. */
export async function canMoveKanbanColumnsOnStickerHub(opts: {
  session: SessionClaims | null;
  stickerTenantId: string;
}): Promise<boolean> {
  const unlocked = await isStickerStaffSessionUnlocked(opts);
  if (!unlocked || !opts.session) return false;
  const access = await getEffectiveModuleAccess(
    opts.stickerTenantId,
    opts.session.role,
  );
  return access.KANBAN_MOVE_COLUMNS === true;
}

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

  const unlocked = await isStickerStaffSessionUnlocked({
    session: opts.session,
    stickerTenantId: opts.stickerTenantId,
  });
  if (!unlocked) return loginNext;

  if (isSingleUserPortable() && opts.session?.tid === opts.stickerTenantId) {
    return orderPathById(opts.orderId);
  }

  const prisma = await getPrisma();
  const user = await prisma.user.findFirst({
    where: {
      id: opts.session!.sub,
      tenantId: opts.stickerTenantId,
      isActive: true,
    },
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
