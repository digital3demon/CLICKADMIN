import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import {
  applyOrderSnapshot,
  parseSnapshotV1,
} from "@/lib/order-revision-snapshot";
import { recordOrderRevision } from "@/lib/record-order-revision";

const orderInclude = {
  clinic: { select: { id: true, name: true, address: true } },
  doctor: { select: { id: true, fullName: true } },
  constructions: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      constructionType: { select: { name: true } },
      priceListItem: { select: { code: true, name: true } },
      material: { select: { name: true } },
    },
  },
} as const;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; revisionId: string }> },
) {
  const prisma = await getOrdersPrisma();
  const { id, revisionId } = await ctx.params;
  const orderId = id?.trim() ?? "";
  const revId = revisionId?.trim() ?? "";
  if (!orderId || !revId) {
    return NextResponse.json({ error: "Не указан наряд или версия" }, { status: 400 });
  }

  try {
    const session = await getSessionFromCookies();
    const tenantId = await orderTenantIdForSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const orderForTenant = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true },
    });
    if (!orderForTenant) {
      return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
    }

    const revision = await prisma.orderRevision.findFirst({
      where: { id: revId, orderId },
      select: { id: true, snapshot: true, createdAt: true },
    });
    if (!revision) {
      return NextResponse.json({ error: "Версия не найдена" }, { status: 404 });
    }

    const snap = parseSnapshotV1(revision.snapshot);
    if (!snap) {
      return NextResponse.json(
        { error: "Некорректный снимок версии" },
        { status: 400 },
      );
    }

    const applied = await applyOrderSnapshot(prisma, orderId, snap);
    if (!applied.ok) {
      return NextResponse.json({ error: applied.error }, { status: 400 });
    }

    const when = revision.createdAt.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    await recordOrderRevision(orderId, {
      kind: "RESTORE",
      summary: `Восстановлена версия от ${when}`,
    });

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        ...orderInclude,
        attachments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            size: true,
            createdAt: true,
            uploadedToKaitenAt: true,
          },
        },
      },
    });

    return NextResponse.json(order);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось восстановить версию" },
      { status: 500 },
    );
  }
}
