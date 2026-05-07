import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import {
  computeNextOrderNumber,
  isArchivedOrderNumberPlaceholder,
} from "@/lib/order-number";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { clampOrderArchiveRetentionDays } from "@/lib/order-archive-retention";
import { deleteOrderAttachmentFile } from "@/lib/order-attachment-storage";

export const dynamic = "force-dynamic";

/** Вернуть наряд из архива (без восстановления карточки Kaiten). */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const orderId = id?.trim() ?? "";
  if (!orderId) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  const row = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: {
      id: true,
      archivedAt: true,
      orderNumber: true,
      tenantId: true,
      attachments: { select: { id: true, diskRelPath: true } },
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }
  if (row.archivedAt == null) {
    return NextResponse.json({ error: "Наряд не в архиве" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { orderArchiveRetentionDays: true },
  });
  const retentionDays = clampOrderArchiveRetentionDays(
    tenant?.orderArchiveRetentionDays,
  );
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  if (row.archivedAt <= cutoff) {
    let storageDeleteFailed = false;
    for (const a of row.attachments) {
      try {
        await deleteOrderAttachmentFile(a.diskRelPath);
      } catch {
        storageDeleteFailed = true;
      }
    }
    if (!storageDeleteFailed) {
      await prisma.order.delete({ where: { id: row.id } });
    }
    return NextResponse.json(
      { error: "Срок хранения архивного заказа истек, восстановление недоступно" },
      { status: 410 },
    );
  }

  const nextNumber =
    row.orderNumber && isArchivedOrderNumberPlaceholder(row.orderNumber)
      ? await computeNextOrderNumber(prisma, row.tenantId)
      : undefined;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      archivedAt: null,
      ...(nextNumber ? { orderNumber: nextNumber } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
